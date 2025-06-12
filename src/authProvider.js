// src/authProvider.js
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from './firebase'; // Impor instance auth dan db dari firebase.js
import { doc, getDoc } from "firebase/firestore";

// HAPUS DAFTAR UID ADMIN YANG DI-HARDCODE
// const ADMIN_UIDS = [
//   "CUZrt0jhYsRyZ7y1JY8KF8TsMty1"
// ];

const authProvider = {
  // Dipanggil saat pengguna mencoba login
  login: async ({ username, password }) => { // 'username' di sini adalah email
    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      if (userCredential.user) {
        // Cek peran pengguna dari Firestore
        const userDocRef = doc(db, "users", userCredential.user.uid); // Asumsi koleksi 'users'
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().role === 'admin') { // Asumsi field peran bernama 'role'
          localStorage.setItem('firebaseUser', JSON.stringify(userCredential.user));
          // Anda mungkin ingin menyimpan data peran juga jika sering diakses
          // localStorage.setItem('userRole', userDocSnap.data().role); 
          return Promise.resolve();
        } else {
          // Jika dokumen tidak ada atau peran bukan 'admin'
          await signOut(auth); // Langsung logout
          localStorage.removeItem('firebaseUser');
          // localStorage.removeItem('userRole');
          let reason = 'Anda tidak memiliki hak akses admin.';
          if (!userDocSnap.exists()) {
            reason = 'Profil pengguna tidak ditemukan.';
          } else if (userDocSnap.data().role !== 'admin') {
            reason = `Peran Anda (${userDocSnap.data().role}) tidak diizinkan untuk login.`;
          }
          return Promise.reject(new Error(reason));
        }
      }
      return Promise.reject(new Error('Login gagal: Pengguna tidak ditemukan setelah sign-in.'));
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = 'Login gagal. Periksa email dan password Anda.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Email atau password salah.';
      }
      return Promise.reject(new Error(errorMessage));
    }
  },

  // Dipanggil saat pengguna logout
  logout: () => {
    localStorage.removeItem('firebaseUser');
    // localStorage.removeItem('userRole'); // Hapus juga jika Anda menyimpannya
    return signOut(auth);
  },

  // Dipanggil saat React Admin perlu memeriksa apakah pengguna melakukan error autentikasi
  checkError: (error) => {
    const status = error.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('firebaseUser');
      // localStorage.removeItem('userRole');
      return Promise.reject();
    }
    return Promise.resolve();
  },

  // Dipanggil saat React Admin perlu memeriksa apakah pengguna sudah login
  checkAuth: () => {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe(); // Hentikan listener setelah pengecekan pertama
        if (user) {
          try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
              localStorage.setItem('firebaseUser', JSON.stringify(user));
              // localStorage.setItem('userRole', userDocSnap.data().role);
              resolve();
            } else {
              // Jika user ada tapi profil tidak ada atau bukan admin, logout
              await signOut(auth);
              localStorage.removeItem('firebaseUser');
              // localStorage.removeItem('userRole');
              reject();
            }
          } catch (firestoreError) {
            console.error("Error checking user role in Firestore (checkAuth):", firestoreError);
            await signOut(auth); // Logout jika gagal cek ke Firestore
            localStorage.removeItem('firebaseUser');
            // localStorage.removeItem('userRole');
            reject();
          }
        } else {
          // Tidak ada user yang login
          localStorage.removeItem('firebaseUser');
          // localStorage.removeItem('userRole');
          reject();
        }
      });
    });
  },

  // Dipanggil saat React Admin perlu mendapatkan informasi identitas pengguna yang login
  getIdentity: async () => {
    // Coba ambil dari localStorage dulu untuk efisiensi
    const userString = localStorage.getItem('firebaseUser');
    // auth.currentUser mungkin belum terisi saat awal load, jadi localStorage lebih diandalkan di sini
    const firebaseUser = userString ? JSON.parse(userString) : auth.currentUser;


    if (firebaseUser && firebaseUser.uid) {
      try {
        const userProfileRef = doc(db, "users", firebaseUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data();
          // Pastikan pengguna ini masih admin, sebagai lapisan keamanan tambahan
          if (profileData.role !== 'admin') {
            // Seharusnya tidak terjadi jika checkAuth dan login sudah benar,
            // tapi baik untuk keamanan ganda.
            await signOut(auth);
            localStorage.removeItem('firebaseUser');
            return Promise.reject(new Error('Akses ditolak setelah verifikasi identitas.'));
          }
          return Promise.resolve({
            id: firebaseUser.uid,
            fullName: profileData.displayName || profileData.nama || firebaseUser.email,
            avatar: profileData.photoURL,
            role: profileData.role, // Sertakan peran dari Firestore
            ...profileData,
          });
        } else {
          console.warn(`Profil pengguna dengan UID ${firebaseUser.uid} tidak ditemukan di Firestore (getIdentity).`);
          // Jika profil tidak ada, kemungkinan besar ini bukan admin yang valid lagi
          await signOut(auth);
          localStorage.removeItem('firebaseUser');
          return Promise.reject(new Error('Profil pengguna tidak ditemukan.'));
        }
      } catch (error) {
        console.error("Error getting user profile from Firestore (getIdentity):", error);
        // Fallback jika Firestore error, tapi sebaiknya logout karena tidak bisa verifikasi peran
        await signOut(auth);
        localStorage.removeItem('firebaseUser');
        return Promise.reject(new Error('Gagal mendapatkan profil pengguna dari Firestore.'));
      }
    }
    return Promise.reject(new Error('Gagal mendapatkan identitas pengguna.'));
  },

  // Dipanggil saat React Admin perlu mendapatkan izin/hak akses pengguna
  getPermissions: () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Hentikan listener setelah pengecekan pertama
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                        resolve('admin'); // Berikan permission 'admin'
                    } else {
                        // Jika user ada tapi profil tidak ada atau bukan admin
                        resolve('restricted_user'); // Atau permission lain yang menandakan akses terbatas
                    }
                } catch (firestoreError) {
                    console.error("Error checking user role in Firestore (getPermissions):", firestoreError);
                    resolve('restricted_user'); // Default ke restricted jika gagal cek Firestore
                }
            } else {
                // Tidak ada user, tidak ada permission khusus
                reject(); // Atau resolve('guest') atau resolve(null) tergantung kebutuhan aplikasi
            }
        });
    });
  },
};

export default authProvider;