// 1. Impor fungsi-fungsi yang kita butuhkan dari Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";         // Untuk layanan Autentikasi
import { getFirestore } from "firebase/firestore"; // Untuk layanan Cloud Firestore (database)



// 2. Konfigurasi Firebase Anda
// (Ini adalah firebaseConfig yang Anda dapatkan dari teman Anda)
const firebaseConfig = {
  apiKey: "AIzaSyAdfbr5DHuQK-47L1pxHwA0WeYwnYTFMvY", 
  authDomain: "cerita-nusa.firebaseapp.com",
  projectId: "cerita-nusa",
  storageBucket: "cerita-nusa.firebasestorage.app", 
  messagingSenderId: "353269754110",
  appId: "1:353269754110:web:5d69ff2bc7cc4c3fa6ddaf"
  
};

// 3. Inisialisasi aplikasi Firebase
// Baris ini "menghubungkan" aplikasi React Anda ke proyek Firebase Anda di cloud.
const app = initializeApp(firebaseConfig);

// 4. Inisialisasi dan ekspor layanan Firebase yang akan digunakan
// Kita membuat "objek" untuk Autentikasi dan Firestore agar bisa dipakai di bagian lain aplikasi.
export const auth = getAuth(app);       // 'auth' akan kita gunakan untuk login, logout, cek status user, dll.
export const db = getFirestore(app);    // 'db' akan kita gunakan untuk baca/tulis data ke Firestore (misalnya data user, favorites).

// export const storage = getStorage(app); // Uncomment ini jika perlu Firebase Storage nanti

export default app;
