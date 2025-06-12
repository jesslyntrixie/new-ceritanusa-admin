// src/dataProvider.js
import { DataProviderContext, fetchUtils } from 'react-admin';
import { db, auth } from './firebase'; // Impor instance Firestore (db) dan Auth (auth)
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp, // Untuk timestamp Firebase
  // Untuk query yang lebih kompleks nanti:
  // limit,
  // startAfter,
  // orderBy,
  // getCountFromServer // Untuk total count di Firestore (memerlukan query ekstra)
} from "firebase/firestore";

// URL untuk backend Django Anda
const API_URL_DJANGO = 'https://web-production-06f9.up.railway.app/api';

// HttpClient untuk Django (Anda sudah punya ini, pastikan sudah benar)
const djangoHttpClient = async (url, options = {}) => {
    const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
    // Hapus token jika ada, karena kita akan pakai Firebase Auth.
    // Jika Django API Anda butuh token sendiri, Anda perlu logic berbeda di sini.
    // Untuk sekarang, kita asumsikan Django API tidak butuh token jika diakses dari admin page ini.

    if (!(options.body instanceof FormData)) {
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        if (!headers.has('Accept')) headers.set('Accept', 'application/json');
        if (options.body && typeof options.body !== 'string') options.body = JSON.stringify(options.body);
    } else {
        if (!headers.has('Accept')) headers.set('Accept', 'application/json');
        headers.delete('Content-Type'); // Biarkan browser set untuk FormData
    }
    options.headers = headers;

    console.log('[djangoHttpClient] Requesting URL:', url);
    console.log('[djangoHttpClient] With options:', JSON.parse(JSON.stringify(options)));
    if (options.body instanceof FormData) {
        console.log('[djangoHttpClient] Body is FormData. Entries:');
        for (let pair of options.body.entries()) {
            console.log(pair[0]+ ', ' + (pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]));
        }
    } else {
        console.log('[djangoHttpClient] Body (stringified):', options.body);
    }
    return fetchUtils.fetchJson(url, options);
};




// --- DataProvider untuk Django (Resource Artikel, Kuis, Summary, Chat) ---
const djangoDataProvider = {
    getList: async (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const queryParams = new URLSearchParams();
        // DRF pagination: page dan page_size (atau limit/offset tergantung konfigurasi backend)
        // React Admin mengirim page (1-based) dan perPage
        // Jika backend Anda pakai limit/offset:
        // queryParams.set('limit', perPage.toString());
        // queryParams.set('offset', ((page - 1) * perPage).toString());
        // Jika backend pakai page & page_size (umum di DRF):
        queryParams.set('page', page.toString());
        queryParams.set('page_size', perPage.toString());

        if (field) queryParams.set('ordering', `${order === 'DESC' ? '-' : ''}${field}`);
        // TODO: Handle params.filter untuk Django

        const url = `${API_URL_DJANGO}/${resource}/?${queryParams.toString()}`;
        console.log(`[Django getList] Requesting: ${url}`);
        const { headers, json } = await djangoHttpClient(url);

        let dataToReturn = [];
        let totalCount = 0;

        // Cek struktur respons dari Django API Anda
        if (json && typeof json.count === 'number' && Array.isArray(json.results)) { // Struktur DRF default
            dataToReturn = json.results;
            totalCount = json.count;
        } else if (headers && headers.has('x-total-count') && Array.isArray(json)) { // Struktur seperti JSON Server
            dataToReturn = json;
            totalCount = parseInt(headers.get('x-total-count'), 10);
        } else if (Array.isArray(json)) { // Fallback jika hanya array tanpa info total
            console.warn(`[Django getList] X-Total-Count or DRF count missing for ${resource}. Using array length as total.`);
            dataToReturn = json;
            totalCount = json.length; // Tidak ideal jika ada paginasi server-side
        } else {
            console.error('[Django getList] Unexpected response structure:', json);
            throw new Error('Invalid response structure from Django API for getList');
        }
        return { data: dataToReturn, total: totalCount };
    },
    getOne: (resource, params) => djangoHttpClient(`${API_URL_DJANGO}/${resource}/${params.id}/`).then(({ json }) => ({ data: json })),


    create: (resource, params) => {
        const url = `${API_URL_DJANGO}/${resource}/`;
        console.log(`[CREATE ${resource}] URL: ${url}`);
        console.log(`[CREATE ${resource}] Original params.data:`, JSON.parse(JSON.stringify(params.data)));

        let isSendingFormData = false;
        const formData = new FormData(); // Selalu buat FormData jika ada potensi file

        // Deteksi apakah ada file yang perlu di-upload
        if (resource === 'artikels' && params.data.image && params.data.image.rawFile instanceof File) {
            isSendingFormData = true;
        } else if (resource === 'quizzes' && params.data.questions) {
            params.data.questions.forEach(question => {
                if (question.image && question.image.rawFile instanceof File) {
                    isSendingFormData = true;
                }
            });
        }

        if (isSendingFormData) {
            console.log(`[CREATE ${resource}] Sending FormData.`);
            // Append field-field top-level
            for (const key in params.data) {
                if (key === 'questions' || key === 'image' || params.data[key] == null || key === 'id' || key === 'created_at' || key === 'updated_at') {
                    continue; // Tangani questions dan image secara khusus, abaikan null/id/readonly
                }
                formData.append(key, params.data[key]);
            }

            if (resource === 'artikels' && params.data.image && params.data.image.rawFile instanceof File) {
                formData.append('image', params.data.image.rawFile, params.data.image.rawFile.name);
            } else if (resource === 'quizzes' && params.data.questions) {
                // Kirim setiap field pertanyaan dengan nama berindeks
                params.data.questions.forEach((question, index) => {
                    formData.append(`questions[${index}][text]`, question.text || '');
                    if (question.image && question.image.rawFile instanceof File) {
                        formData.append(`questions[${index}][image]`, question.image.rawFile, question.image.rawFile.name);
                    } else {
                        // Jika tidak ada file baru, backend (QuestionSerializer)
                        // akan melihat q.get('image', None) sebagai None. Ini OK.
                        // Tidak perlu mengirim apa-apa atau kirim string kosong jika backend menghapusnya dengan itu.
                        // formData.append(`questions[${index}][image]`, ''); // Opsional, tergantung backend
                    }
                    if (question.choices && Array.isArray(question.choices)) {
                        question.choices.forEach((choice, choiceIndex) => {
                            formData.append(`questions[${index}][choices][${choiceIndex}][text]`, choice.text || '');
                            formData.append(`questions[${index}][choices][${choiceIndex}][is_correct]`, choice.is_correct != null ? choice.is_correct : false);
                        });
                    }
                });
            }
            return djangoHttpClient(url, { method: 'POST', body: formData })
                   .then(({ json }) => ({ data: json }));
        } else {
            // Tidak ada file baru, kirim sebagai JSON
            console.log(`[CREATE ${resource}] No new image files. Sending JSON.`);
            const dataToSend = JSON.parse(JSON.stringify(params.data));
            // Bersihkan objek gambar jika tidak ada file
            if (resource === 'quizzes' && dataToSend.questions) {
                dataToSend.questions = dataToSend.questions.map(q => {
                    const cleanQ = { ...q };
                    if (cleanQ.image && typeof cleanQ.image === 'object') delete cleanQ.image;
                    return cleanQ;
                });
            } else if (dataToSend.image && typeof dataToSend.image === 'object') {
                delete dataToSend.image;
            }
            return djangoHttpClient(url, { method: 'POST', body: dataToSend })
                   .then(({ json }) => ({ data: { ...params.data, id: json.id, ...json } }));
        }
    },

    update: (resource, params) => {
        const url = `${API_URL_DJANGO}/${resource}/${params.id}/`;
        console.log(`[UPDATE ${resource}] URL: ${url}`);
        console.log(`[UPDATE ${resource}] Original params.data:`, JSON.parse(JSON.stringify(params.data)));

        let isSendingFormData = false;
        const formData = new FormData();

        if (resource === 'artikels' && params.data.image && params.data.image.rawFile instanceof File) {
            isSendingFormData = true;
        } else if (resource === 'quizzes' && params.data.questions) {
            params.data.questions.forEach(question => {
                if (question.image && question.image.rawFile instanceof File) {
                    isSendingFormData = true;
                }
            });
        }

        if (isSendingFormData) {
            console.log(`[UPDATE ${resource}] Sending FormData.`);
            for (const key in params.data) {
                if (key === 'questions' || key === 'image' || params.data[key] == null || key === 'id' || key === 'created_at' || key === 'updated_at') {
                    continue;
                }
                formData.append(key, params.data[key]);
            }

            if (resource === 'artikels' && params.data.image && params.data.image.rawFile instanceof File) {
                formData.append('image', params.data.image.rawFile, params.data.image.rawFile.name);
            } else if (resource === 'quizzes' && params.data.questions) {
                params.data.questions.forEach((question, index) => {
                    formData.append(`questions[${index}][text]`, question.text || '');
                    if (question.image && question.image.rawFile instanceof File) {
                        formData.append(`questions[${index}][image]`, question.image.rawFile, question.image.rawFile.name);
                    } else if (question.image === null) {
                        // Jika pengguna secara eksplisit menghapus gambar (ImageInput akan set image jadi null)
                        formData.append(`questions[${index}][image]`, ''); // Kirim string kosong untuk menandakan penghapusan ke backend
                    }
                    // Jika question.image adalah objek {src: URL_LAMA, ...} (gambar lama tidak diubah),
                    // kita tidak mengirim `questions[index][image]` di FormData.
                    // Backend (QuizSerializer.update) akan menggunakan logic `instance.questions[idx].image` untuk mempertahankan gambar lama.

                    if (question.choices && Array.isArray(question.choices)) {
                        question.choices.forEach((choice, choiceIndex) => {
                            formData.append(`questions[${index}][choices][${choiceIndex}][text]`, choice.text || '');
                            formData.append(`questions[${index}][choices][${choiceIndex}][is_correct]`, choice.is_correct != null ? choice.is_correct : false);
                        });
                    }
                });
            }
            return flexibleHttpClient(url, { method: 'PUT', body: formData })
                   .then(({ json }) => ({ data: json }));
        } else {
            // Tidak ada file baru, kirim sebagai JSON
            console.log(`[UPDATE ${resource}] No new image files. Sending JSON.`);
            const dataToSend = JSON.parse(JSON.stringify(params.data));
            if (resource === 'quizzes' && dataToSend.questions) {
                dataToSend.questions = dataToSend.questions.map(q => {
                    const cleanQ = { ...q };
                    delete cleanQ.id;
                    if (cleanQ.image && typeof cleanQ.image === 'object') {
                        // Jika gambar tidak diubah dan masih objek dari ImageInput (misal {src: URL_LAMA})
                        // Kirim null agar backend tahu tidak ada file baru dan bisa mempertahankan yg lama atau mengosongkan
                        // berdasarkan logic di QuizSerializer.update:
                        // `elif idx < len(instance.questions) and instance.questions[idx].image: question.image = instance.questions[idx].image`
                        // ini akan berjalan jika q.get('image', None) di backend adalah None.
                        cleanQ.image = null;
                    } else if (typeof cleanQ.image === 'string' && cleanQ.image.startsWith('/api/')) {
                        // Jika backend Anda ingin menerima URL gambar lama sebagai string untuk "tidak ada perubahan"
                        // Anda bisa biarkan. Tapi ImageField biasanya tidak suka ini saat update.
                        // Untuk konsistensi dengan ImageField yang mengharapkan file atau null,
                        // lebih baik set null jika tidak ada file baru.
                        cleanQ.image = null; // Atau biarkan string URL jika backend Anda bisa handle.
                    }
                    return cleanQ;
                });
            } else if (resource === 'artikels' && dataToSend.image && typeof dataToSend.image === 'object') {
                dataToSend.image = (typeof dataToSend.image.src === 'string' && dataToSend.image.src.startsWith('/api/')) ? null : null; // Atau null
            }
            delete dataToSend.id;
            delete dataToSend.created_at;
            delete dataToSend.updated_at;

            return djangoHttpClient(url, { method: 'PUT', body: dataToSend })
                   .then(({ json }) => ({ data: json }));
        }
    },


    delete: (resource, params) => djangoHttpClient(`${API_URL_DJANGO}/${resource}/${params.id}/`, { method: 'DELETE' }).then(({ status, json }) => {
        if (status === 204 || status === 202) return { data: { id: params.id } }; // ID item yg dihapus
        return { data: json }; // Atau data item yg dihapus jika API mengembalikannya
    }),


    // Implementasikan getMany dan getManyReference jika dibutuhkan oleh ReferenceField/ReferenceArrayField
    // yang merujuk ke resource Django. Jika tidak, React Admin akan fallback ke multiple getOne.
    getMany: (resource, params) => {
        const query = new URLSearchParams();
        params.ids.forEach(id => query.append('id', id)); // atau 'ids[]' tergantung backend Anda
        return djangoHttpClient(`${API_URL_DJANGO}/${resource}/?${query.toString()}`).then(({ json }) => ({ data: json }));
    },

    getManyReference: async (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;

        const queryParams = new URLSearchParams();
        queryParams.set(params.target, params.id); // Misal target=article_id, id=ID_ARTIKEL_DARI_SUMMARY
        queryParams.set('page', page.toString());
        queryParams.set('page_size', perPage.toString());
        if (field) queryParams.set('ordering', `${order === 'DESC' ? '-' : ''}${field}`);

        const url = `${API_URL_DJANGO}/${resource}/?${queryParams.toString()}`;
        const { headers, json } = await djangoHttpClient(url);

        // Sesuaikan dengan struktur respons Django Anda
        if (json && typeof json.count === 'number' && Array.isArray(json.results)) {
            return { data: json.results, total: json.count };
        }
        // Fallback jika API mengembalikan array langsung
        if (Array.isArray(json)) {
             const total = headers.has('x-total-count') ? parseInt(headers.get('x-total-count'), 10) : json.length;
             return { data: json, total };
        }
        throw new Error('Invalid response structure for getManyReference from Django API');
    },

    // updateMany dan deleteMany bisa di-stub atau diimplementasikan jika perlu
    updateMany: (resource, params) => Promise.resolve({ data: [] }), // Stub
    deleteMany: (resource, params) => Promise.resolve({ data: [] }), // Stub
};


// --- DataProvider untuk Firebase (Firestore) ---
const firestoreDataProvider = {
    getList: async (resource, params) => {
     
        console.log(`[Firestore getList] For resource: ${resource}, Params:`, params);
        const collRef = collection(db, resource);
        let q = query(collRef); // Query dasar

        // Filter favorites berdasarkan pengguna yang sedang login
        if (resource === 'favorites') {
            if (auth.currentUser && auth.currentUser.uid) {
                console.log(`[Firestore getList] Filtering favorites for user: ${auth.currentUser.uid}`);
                q = query(q, where("userId", "==", auth.currentUser.uid));
            } else {
                // Tidak ada user yang login, kembalikan data kosong atau error
                console.warn("[Firestore getList] No current user for favorites, returning empty.");
                return { data: [], total: 0 };
            }
        }

        // TODO: Implement sorting (orderBy) dan pagination (limit, startAfter) untuk Firestore
        // if (field) q = query(q, orderBy(field, order.toLowerCase()));
        // Ini memerlukan logic lebih untuk cursor-based pagination jika data besar

        // Untuk Firestore, getCountFromServer adalah cara terbaik untuk total, tapi ini query ekstra.
        // Untuk simple list, kita bisa pakai data.length, TAPI ini hanya total data yang terambil,
        // bukan total keseluruhan di database jika ada paginasi/limit.
        // const totalSnapshot = await getCountFromServer(q); // Ini query terpisah
        // const total = totalSnapshot.data().count;
       
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));

        // Total untuk favorites yang sudah difilter
        const total = data.length; 

        console.log(`[Firestore getList] Data for ${resource}:`, data, `Total reported: ${total}`);
        return { data, total };
    },

    getOne: async (resource, params) => {
        console.log(`[Firestore getOne] For resource: ${resource}, ID: ${params.id}`);
        const docRef = doc(db, resource, params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { data: { id: docSnap.id, ...docSnap.data() } };
        }
        throw new Error('Document not found in Firestore');
    },
    create: async (resource, params) => {
        console.log(`[Firestore create] For resource: ${resource}, Data:`, params.data);
        let dataToCreate = { ...params.data };
        delete dataToCreate.id; // Firestore auto-generates ID

        if (resource === 'favorites' && auth.currentUser) {
            dataToCreate.userId = auth.currentUser.uid; // Pastikan userId dari pengguna yang login
            dataToCreate.createdAt = Timestamp.now();   // Tambahkan timestamp server
        }
         // Konversi birth date jika ada dan merupakan objek Date
            if (dataToCreate.birth && dataToCreate.birth instanceof Date) {
                dataToCreate.birth = Timestamp.fromDate(dataToCreate.birth);
            } else if (dataToCreate.birth === undefined || dataToCreate.birth === '') {
                // Jika dikosongkan, set ke null atau hapus fieldnya
                dataToCreate.birth = null; 
            }

        const docRef = await addDoc(collection(db, resource), dataToCreate);
        return { data: { ...params.data, id: docRef.id } }; // Kembalikan data asli + ID baru
    },

    update: async (resource, params) => {
        console.log(`[Firestore update] For resource: ${resource}, ID: ${params.id}, Data:`, params.data);
        const docRef = doc(db, resource, params.id);
        const dataToUpdate = { ...params.data };
        delete dataToUpdate.id; // Jangan update ID


        if (resource === 'users' || resource === 'mentors') {
            dataToUpdate.updatedAt = Timestamp.now();

            // Konversi birth date jika ada dan merupakan objek Date
            if (dataToUpdate.birth && dataToUpdate.birth instanceof Date) {
                dataToUpdate.birth = Timestamp.fromDate(dataToToUpdate.birth);
            } else if (dataToUpdate.birth === undefined || dataToUpdate.birth === '' || dataToUpdate.birth === null) {
                // Jika dikosongkan atau null dari input, set ke null di Firestore
                // Perlu dicek apakah DateInput mengirim null atau string kosong jika dihapus
                // React Admin DateInput biasanya mengirim string kosong jika field dihapus, atau null jika di-reset.
                // Jika DateInput mengirim string kosong '' dan field birth Anda bisa null,
                // Anda mungkin ingin menghapus fieldnya atau set ke null.
                // Untuk amannya, jika string kosong, set jadi null.
                dataToUpdate.birth = null;
            }
            // ... (logika photoUrl jika ada) ...
        }
        await updateDoc(docRef, dataToUpdate);
        return { data: { id: params.id, ...params.data } }; // Kembalikan data yang diupdate
    },
    delete: async (resource, params) => {
        console.log(`[Firestore delete] For resource: ${resource}, ID: ${params.id}`);
        await deleteDoc(doc(db, resource, params.id));
        return { data: { id: params.id } }; // Kembalikan ID item yang dihapus
    },
    getMany: async (resource, params) => {
        console.log(`[Firestore getMany] ${resource}, ids:`, params.ids);
        const ids = params.ids.filter(id => id != null && typeof id === 'string' && id.trim() !== '');
        if (ids.length === 0) return { data: [] };

        // Firestore 'in' query supports up to 30 items by default in newer SDKs (previously 10)
        // For more, you'd do multiple queries.
        const collRef = collection(db, resource);
        const q = query(collRef, where("__name__", "in", ids)); // __name__ adalah ID dokumen
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return { data };
      },
    getManyReference: async (resource, params) => {
        console.log(`[Firestore getManyReference] For resource: ${resource}, Target: ${params.target}, ID: ${params.id}`);
        // Contoh: dapatkan semua 'favorites' untuk 'article' tertentu (jika 'article_id' ada di 'favorites')
        // atau semua 'favorites' untuk 'user' tertentu (jika 'user_id' ada di 'favorites')
        const { page, perPage } = params.pagination; // React Admin pagination (1-based)
        const { field, order } = params.sort;

        let q = query(collection(db, resource), where(params.target, "==", params.id));
        // TODO: Implement sorting (orderBy) dan pagination (limit, startAfter) untuk Firestore
        // if (field) q = query(q, orderBy(field, order.toLowerCase()));
        // q = query(q, limit(perPage));
        // Untuk startAfter, Anda perlu cursor dari query sebelumnya

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
        // const total = snapshot.size; // Ini hanya jumlah yang diambil, bukan total keseluruhan jika ada limit
        // Untuk total count sebenarnya dengan filter, Anda perlu query terpisah:
        // const countQuery = query(collection(db, resource), where(params.target, "==", params.id));
        // const totalSnapshot = await getCountFromServer(countQuery);
        // const total = totalSnapshot.data().count;
        return { data, total: data.length }; // Sederhanakan total untuk sekarang
    },
     updateMany: async (resource, params) => {
        console.log(`[Firestore updateMany] ${resource}, ids:`, params.ids, 'data:', params.data);
        const dataToUpdate = { ...params.data };
        delete dataToUpdate.id; // id tidak diupdate per item
        const updatedIds = [];
        for (const id of params.ids) {
            await updateDoc(doc(db, resource, id), dataToUpdate);
            updatedIds.push(id);
        }
        return { data: updatedIds };
    },
    deleteMany: async (resource, params) => {
        console.log(`[Firestore deleteMany] ${resource}, ids:`, params.ids);
        const deletedIds = [];
        for (const id of params.ids) {
            await deleteDoc(doc(db, resource, id));
            deletedIds.push(id);
        }
        return { data: deletedIds };
    }
};

// --- Wrapper DataProvider ---
const dataProvider = {
    // Delegasikan ke provider yang sesuai berdasarkan nama resource
    getList: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.getList(resource, params);
        }
        return djangoDataProvider.getList(resource, params);
    },
    getOne: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.getOne(resource, params);
        }
        return djangoDataProvider.getOne(resource, params);
    },
    getMany: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.getMany(resource, params);
        }
        return djangoDataProvider.getMany(resource, params); // Pastikan djangoDataProvider punya ini
    },
    getManyReference: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.getManyReference(resource, params);
        }
        return djangoDataProvider.getManyReference(resource, params); // Pastikan djangoDataProvider punya ini
    },
    create: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.create(resource, params);
        }
        return djangoDataProvider.create(resource, params);
    },
    update: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.update(resource, params);
        }
        return djangoDataProvider.update(resource, params);
    },
    updateMany: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.updateMany(resource, params);
        }
        return djangoDataProvider.updateMany(resource, params);
    },
    delete: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.delete(resource, params);
        }
        return djangoDataProvider.delete(resource, params);
    },
    deleteMany: (resource, params) => {
        if (resource === 'users' || resource === 'mentors' || resource === 'favorites') {
            return firestoreDataProvider.deleteMany(resource, params);
        }
        return djangoDataProvider.deleteMany(resource, params);
    }
};

export default dataProvider;

