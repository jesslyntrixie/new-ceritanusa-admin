// src/dataProvider.js
import { fetchUtils } from 'react-admin';
import { db, auth } from './firebase'; // Pastikan file firebase.js Anda sudah benar
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
  Timestamp,
} from "firebase/firestore";


const API_URL_DJANGO = 'https://web-production-06f9.up.railway.app/api';

const djangoHttpClient = async (url, options = {}) => {
    const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);

    if (!(options.body instanceof FormData)) {
        // Untuk request JSON
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        if (!headers.has('Accept')) {
            headers.set('Accept', 'application/json');
        }
        if (options.body && typeof options.body !== 'string') {
            options.body = JSON.stringify(options.body);
        }
    } else {
        if (!headers.has('Accept')) {
            headers.set('Accept', 'application/json');
        }
        headers.delete('Content-Type'); 
    }
    options.headers = headers;

    console.log('[djangoHttpClient] Requesting URL:', url);
    console.log('[djangoHttpClient] Method:', options.method); 
    if (options.body instanceof FormData) {
        console.log('[djangoHttpClient] Body is FormData. Entries:');
        for (let pair of options.body.entries()) {
            console.log(pair[0]+ ', ' + (pair[1] instanceof File ? `File: ${pair[1].name} (type: ${pair[1].type})` : pair[1]));
        }
    } else {
        console.log('[djangoHttpClient] Body (stringified):', options.body);
    }
    return fetchUtils.fetchJson(url, options);
};


// --- DataProvider untuk Resource Django ---
const djangoDataProvider = {
    getList: async (resource, params) => {
           
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const queryParams = new URLSearchParams();

    queryParams.set('page', page.toString());
    queryParams.set('page_size', perPage.toString());
    if (field) {
        queryParams.set('ordering', `${order === 'DESC' ? '-' : ''}${field}`);
    }

    let url;
    if (resource === 'favorites' && params.filter && params.filter.userId) {
        const userId = params.filter.userId;
        delete params.filter.userId; // Hapus dari filter karena sudah jadi bagian path
        url = `${API_URL_DJANGO}/${resource}/${userId}/?${queryParams.toString()}`;
    } else if (resource === 'favorites' && (!params.filter || !params.filter.userId)) {
        // Handle kasus di mana userId tidak tersedia untuk resource favorites
        console.warn("[Django getList] userId filter is required for 'favorites' resource to call Django API.");
        return { data: [], total: 0 }; 
    } else {
        url = `${API_URL_DJANGO}/${resource}/?${queryParams.toString()}`;
    }

    // Terapkan filter lain yang mungkin ada di params.filter
    if (params.filter) {
        Object.keys(params.filter).forEach(key => {
            // Pastikan userId tidak ditambahkan lagi jika sudah dihandle
            if (!(resource === 'favorites' && key === 'userId')) {
                 // Cek apakah URL sudah punya query string
                const [basePath, existingQueryString] = url.split('?');
                const currentQueryParams = new URLSearchParams(existingQueryString || '');
                currentQueryParams.set(key, params.filter[key]);
                url = `${basePath}?${currentQueryParams.toString()}`;
            }
        });
    }


        url = `${API_URL_DJANGO}/${resource}/?${queryParams.toString()}`;

        console.log(`[Django getList] Requesting: ${url} for resource ${resource}`);
        const { headers, json } = await djangoHttpClient(url);

        let dataToReturn = [];
        let totalCount = 0;

        if (json && typeof json.count === 'number' && Array.isArray(json.results)) {
            dataToReturn = json.results;
            totalCount = json.count;
        } else if (headers && headers.has('x-total-count') && Array.isArray(json)) {
            dataToReturn = json;
            totalCount = parseInt(headers.get('x-total-count'), 10);
        } else if (Array.isArray(json)) {
            console.warn(`[Django getList] X-Total-Count or DRF count missing for ${resource}. Using array length as total.`);
            dataToReturn = json;
            totalCount = json.length; 
        } else {
            console.error(`[Django getList] Unexpected response structure for ${resource}:`, json);
            throw new Error('Invalid response structure from Django API for getList');
        }
        
        console.log(`[Django getList] Data for ${resource} (first item if any):`, dataToReturn.length > 0 ? dataToReturn[0] : 'empty');
        return { data: dataToReturn, total: totalCount };
    },

    getOne: (resource, params) => djangoHttpClient(`${API_URL_DJANGO}/${resource}/${params.id}/`).then(({ json }) => ({ data: json })),

    create: (resource, params) => {
        const url = `${API_URL_DJANGO}/${resource}/`;
        console.log(`[Django CREATE ${resource}] URL: ${url}`);
        console.log(`[Django CREATE ${resource}] Original params.data:`, JSON.parse(JSON.stringify(params.data)));

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
            console.log(`[Django CREATE ${resource}] Sending FormData.`);
            for (const key in params.data) {
                if (params.data[key] == null || ['id', 'created_at', 'updated_at'].includes(key)) continue;

                if (key === 'image' && resource === 'artikels' && params.data.image.rawFile instanceof File) {
                    formData.append('image', params.data.image.rawFile, params.data.image.rawFile.name);
                } else if (key === 'questions' && resource === 'quizzes') {
                    params.data.questions.forEach((question, index) => {
                        formData.append(`questions[${index}][text]`, question.text || '');
                        if (question.image && question.image.rawFile instanceof File) {
                            formData.append(`questions[${index}][image]`, question.image.rawFile, question.image.rawFile.name);
                        }
                        // Untuk create, jika tidak ada gambar, biarkan kosong (backend ImageField required=False)
                        if (question.choices && Array.isArray(question.choices)) {
                            question.choices.forEach((choice, choiceIndex) => {
                                formData.append(`questions[${index}][choices][${choiceIndex}][text]`, choice.text || '');
                                formData.append(`questions[${index}][choices][${choiceIndex}][is_correct]`, choice.is_correct != null ? choice.is_correct.toString() : 'false');
                            });
                        }
                    });
                } else if (key !== 'image' && key !== 'questions') {
                    formData.append(key, params.data[key]);
                }
            }
            return djangoHttpClient(url, { method: 'POST', body: formData })
                   .then(({ json }) => ({ data: { ...json } })); // DRF create biasanya mengembalikan objek lengkap
        } else {
            console.log(`[Django CREATE ${resource}] No new image files. Sending JSON.`);
            const dataToSend = { ...params.data };
            delete dataToSend.id; delete dataToSend.created_at; delete dataToSend.updated_at;
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
        console.log(`[Django UPDATE ${resource}] URL: ${url}`);
        console.log(`[Django UPDATE ${resource}] Original params.data:`, JSON.parse(JSON.stringify(params.data)));

        console.log(`[Django UPDATE ${resource}] URL: ${url}`);
        // Log the specific part of params.data we re interested in
        if (resource === 'quizzes') {
            console.log('[Django UPDATE quizzes] Original params.data.questions:', JSON.parse(JSON.stringify(params.data.questions)));
            params.data.questions.forEach((question, index) => {
                console.log(`[Django UPDATE quizzes] Processing question ${index}, image data:`, question.image); // CRITICAL DEBUG LINE
            });
        }

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
            console.log(`[Django UPDATE ${resource}] Sending FormData.`);
            for (const key in params.data) {
                if (params.data[key] == null || ['id', 'created_at', 'updated_at'].includes(key)) continue;

                if (key === 'image' && resource === 'artikels' && params.data.image.rawFile instanceof File) {
                    formData.append('image', params.data.image.rawFile, params.data.image.rawFile.name);
                } else if (key === 'questions' && resource === 'quizzes') {
                    params.data.questions.forEach((question, index) => {
                        formData.append(`questions[${index}][text]`, question.text || '');
                        if (question.image && question.image.rawFile instanceof File) {
                            formData.append(`questions[${index}][image]`, question.image.rawFile, question.image.rawFile.name);
                        } else if (question.image === null) {
                            formData.append(`questions[${index}][image]`, ''); // Kirim string kosong untuk menghapus
                        }
                        // Jika question.image adalah objek {src: URL_LAMA} (tidak diubah), JANGAN append ke FormData
                        // Biarkan backend menggunakan logic untuk mempertahankan gambar lama
                        if (question.choices && Array.isArray(question.choices)) {
                            question.choices.forEach((choice, choiceIndex) => {
                                formData.append(`questions[${index}][choices][${choiceIndex}][text]`, choice.text || '');
                                formData.append(`questions[${index}][choices][${choiceIndex}][is_correct]`, choice.is_correct != null ? choice.is_correct.toString() : 'false');
                            });
                        }
                    });
                } else if (key !== 'image' && key !== 'questions') {
                    formData.append(key, params.data[key]);
                }
            }
            return djangoHttpClient(url, { method: 'PUT', body: formData })
                   .then(({ json }) => ({ data: json }));
        } else {
            console.log(`[Django UPDATE ${resource}] No new image files. Sending JSON.`);
            const dataToSend = JSON.parse(JSON.stringify(params.data));
            delete dataToSend.id; delete dataToSend.created_at; delete dataToSend.updated_at;

            if (resource === 'quizzes' && dataToSend.questions) {
                dataToSend.questions = dataToSend.questions.map(q => {
                    const cleanQ = { ...q };
                    delete cleanQ.id;
                    if (cleanQ.image && typeof cleanQ.image === 'object') {
                        // Jika gambar tidak diubah (ImageInput masih berisi objek {src: URL_LAMA}),
                        // set ke null agar backend tahu tidak ada file baru.
                        // Backend Anda (serializers.py) punya logic:
                        // `elif idx < len(instance.questions) and instance.questions[idx].image: question.image = instance.questions[idx].image`
                        // Ini akan aktif jika q.get('image', None) di backend adalah None.
                        cleanQ.image = null;
                    } else if (typeof cleanQ.image === 'string' && cleanQ.image.startsWith('/api/')) {
                        // Jika ini string URL lama, set null juga agar backend mempertahankan.
                        cleanQ.image = null;
                    }
                    return cleanQ;
                });
            } else if (resource === 'artikels' && dataToSend.image) {
                // Jika gambar artikel tidak diubah (masih objek dari ImageInput atau URL string lama)
                if (typeof dataToSend.image === 'object' || (typeof dataToSend.image === 'string' && dataToSend.image.startsWith('/api/'))) {
                    // Backend ArtikelSerializer.update: `image = validated_data.get('image', None)`.
                    // Jika 'image' tidak ada di validated_data, maka 'image' akan None, dan instance.image lama dipertahankan.
                    // Jadi kita hapus saja dari payload JSON.
                    delete dataToSend.image;
                }
            }
            return djangoHttpClient(url, { method: 'PUT', body: dataToSend })
                   .then(({ json }) => ({ data: json }));
        }
    },
    delete: (resource, params) => djangoHttpClient(`${API_URL_DJANGO}/${resource}/${params.id}/`, { method: 'DELETE' })
        .then(({ status, json }) => {
            if (status === 204 || status === 202) return { data: { id: params.id } };
            return { data: json || { id: params.id } }; // Pastikan selalu ada data.id
    }),
    getMany: async (resource, params) => {
        const query = new URLSearchParams();
        params.ids.forEach(id => query.append('id__in', id));
        const url = `${API_URL_DJANGO}/${resource}/?${query.toString()}`;
        console.log(`[Django getMany] Requesting: ${url}`);
        const { json } = await djangoHttpClient(url);
        // Asumsi API mengembalikan array untuk getMany, atau sesuaikan jika formatnya beda
        return { data: Array.isArray(json) ? json : (json && Array.isArray(json.results) ? json.results : []) };
    },

getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const queryParams = new URLSearchParams();

    queryParams.set('page', page.toString());
    queryParams.set('page_size', perPage.toString());
    if (field) {
        queryParams.set('ordering', `<span class="math-inline">\{order \=\=\= 'DESC' ? '\-' \: ''\}</span>{field}`);
    }

    let url;
    // params.id di sini adalah UID Firebase dari UserShow (karena source="id" di ReferenceManyField)
    if (resource === 'favorites' && params.id) {
        url = `${API_URL_DJANGO}/${resource}/${params.id}/?${queryParams.toString()}`;
    } else {
        // Logika fallback jika resource bukan 'favorites' atau params.id tidak ada
        // Ini seharusnya tidak terjadi jika dipanggil dari ReferenceManyField dengan konfigurasi benar
        console.warn(`[Django getManyReference] Called for resource ${resource} without a valid params.id for favorites logic or for an unhandled resource.`);
        // Untuk resource lain yang mungkin menggunakan getManyReference dengan query param biasa:
        // queryParams.set(params.target, params.id); // params.target adalah field penghubung, misal 'user_id'
        // url = `<span class="math-inline">\{API\_URL\_DJANGO\}/</span>{resource}/?${queryParams.toString()}`;
        // throw new Error('Unsupported getManyReference call'); // Atau kembalikan data kosong
        return { data: [], total: 0 }; // Kembalikan kosong jika tidak sesuai harapan
    }

    console.log(`[Django getManyReference] Requesting: ${url} for resource ${resource} with main ID: ${params.id}`);
    const { headers, json } = await djangoHttpClient(url);

    if (Array.isArray(json)) {
         const total = headers && headers.has('x-total-count')
                         ? parseInt(headers.get('x-total-count'), 10)
                         : json.length; 
         console.log(`[Django getManyReference] Received data for ${resource}. Total: ${total}. Data sample:`, json.slice(0,1));
         return { data: json, total };
    } else if (json && typeof json.count === 'number' && Array.isArray(json.results)) { // Untuk API DRF standar
         console.log(`[Django getManyReference] Received DRF paginated data for ${resource}. Total: ${json.count}.`);
         return { data: json.results, total: json.count };
    }

    console.error(`[Django getManyReference] Unexpected response structure for ${resource}:`, json);
    throw new Error('Invalid response structure for getManyReference from Django API');
},
    updateMany: (resource, params) => Promise.resolve({ data: [] }),
    deleteMany: (resource, params) => Promise.resolve({ data: [] }),
};

// --- DataProvider untuk Firebase (Firestore) ---
const firestoreDataProvider = {
    getList: async (resource, params) => {
        console.log(`[Firestore getList] For resource: ${resource}, Params:`, params); 
        const collRef = collection(db, resource); 
        let q = query(collRef); 
        const { filter } = params; 

        if (resource === 'users' && filter && filter.role) { 
            console.log(`[Firestore getList] Filtering users by role: ${filter.role}`); 
            q = query(q, where("role", "==", filter.role)); 
        }
      

        const snapshot = await getDocs(q); 

        const processedData = snapshot.docs.map(docSnapshot => { 
            const docData = { id: docSnapshot.id, ...docSnapshot.data() }; 
            return convertTimestampsAndDateStringsToDates(docData); 
        });

        const total = processedData.length; 

        console.log(`[Firestore getList] Data for ${resource}:`, processedData, `Total reported: ${total}`); //
        
        return { data: processedData, total: total }; 
    },
    getOne: async (resource, params) => {
        console.log(`[Firestore getOne] For resource: ${resource}, ID: ${params.id}`);
        const docRef = doc(db, resource, params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const docData = docSnap.data();

            return { data: { id: docSnap.id, ...convertTimestampsAndDateStringsToDates(docData) } };
        }
        console.error(`[Firestore getOne] Document ${params.id} not found in Firestore resource ${resource}`);
        throw new Error(`Document ${params.id} not found`);
    },
    create: async (resource, params) => {
        console.log(`[Firestore create] For resource: ${resource}, Data:`, params.data);
        let dataToCreate = { ...params.data };
        delete dataToCreate.id;


        if (resource === 'users' || resource === 'mentors' ) {
            dataToCreate.createdAt = Timestamp.now(); 
            if (dataToCreate.hasOwnProperty('birth')) {
                if (dataToCreate.birth && dataToCreate.birth instanceof Date) {
                    dataToCreate.birth = Timestamp.fromDate(dataToCreate.birth);
                } else if (typeof dataToCreate.birth === 'string' && !isNaN(new Date(dataToCreate.birth))) {
                    dataToCreate.birth = Timestamp.fromDate(new Date(dataToCreate.birth)); 
                } else if (dataToCreate.birth === undefined || dataToCreate.birth === '' || dataToCreate.birth === null) {
                    dataToCreate.birth = null;
                }
            }

        }
         const docRef = await addDoc(collection(db, resource), dataToCreate);
        const newDocSnap = await getDoc(docRef); // Ambil data yang baru saja dibuat dari Firestore
        const responseData = newDocSnap.data();
   
        return { data: { id: newDocSnap.id, ...convertTimestampsAndDateStringsToDates(responseData) } };
    },
    update: async (resource, params) => {
        console.log(`[Firestore update] For resource: ${resource}, ID: ${params.id}, Data:`, params.data);
        const docRef = doc(db, resource, params.id);
        let dataToUpdate = { ...params.data };
        delete dataToUpdate.id;

      
        if (resource === 'users' || resource === 'mentors' ) {
            dataToUpdate.updatedAt = Timestamp.now(); 
            if (dataToUpdate.hasOwnProperty('birth')) {
                if (dataToUpdate.birth && dataToUpdate.birth instanceof Date) {
                    dataToUpdate.birth = Timestamp.fromDate(dataToUpdate.birth); 
                } else if (typeof dataToUpdate.birth === 'string' && !isNaN(new Date(dataToUpdate.birth))) {
                    dataToUpdate.birth = Timestamp.fromDate(new Date(dataToUpdate.birth)); 
                } else if (dataToUpdate.birth === undefined || dataToUpdate.birth === '' || dataToUpdate.birth === null) {
                    dataToUpdate.birth = null;
                }
            }
            
        }
        await updateDoc(docRef, dataToUpdate);
        const updatedDocSnap = await getDoc(docRef); 
        const responseData = updatedDocSnap.data();
       
        return { data: { id: updatedDocSnap.id, ...convertTimestampsAndDateStringsToDates(responseData) } };
    },
    delete: async (resource, params) => {
        console.log(`[Firestore delete] For resource: ${resource}, ID: ${params.id}`);
        await deleteDoc(doc(db, resource, params.id));
        return { data: { id: params.id } };
    },
    getMany: async (resource, params) => {
        console.log(`[Firestore getMany] ${resource}, ids:`, params.ids);
        const ids = params.ids.filter(id => id != null && typeof id === 'string' && id.trim() !== '');
        if (ids.length === 0) return { data: [] };
        const collRef = collection(db, resource);
        // Firestore 'in' query is limited (e.g., 30 items). For more, batch requests.
        const limitedIds = ids.slice(0, 30); // Handle limitation
        if (ids.length > 30) {
            console.warn(`[Firestore getMany] Requested ${ids.length} IDs, but 'in' query is limited. Fetching first 30.`);
        }
        const q = query(collRef, where("__name__", "in", limitedIds));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return { data };
      },
    getManyReference: async (resource, params) => {
        console.log(`[Firestore getManyReference] For resource: ${resource}, Target: ${params.target}, ID: ${params.id}`);
        let q = query(collection(db, resource), where(params.target, "==", params.id));
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
        console.log(`[Firestore getManyReference] Data for ${resource}:`, data);
        return { data, total: data.length };
    },
    updateMany: async (resource, params) => {
        console.log(`[Firestore updateMany] ${resource}, ids:`, params.ids, 'data:', params.data);
        const dataToUpdate = { ...params.data }; delete dataToUpdate.id;
        const updatedIds = [];
        for (const id of params.ids) {
            try {
                await updateDoc(doc(db, resource, id), dataToUpdate);
                updatedIds.push(id);
            } catch (error) { console.error(`[Firestore updateMany] Error updating ${resource}/${id}:`, error); }
        }
        return { data: updatedIds };
    },
    deleteMany: async (resource, params) => {
        console.log(`[Firestore deleteMany] ${resource}, ids:`, params.ids);
        const deletedIds = [];
        for (const id of params.ids) {
            try {
                await deleteDoc(doc(db, resource, id));
                deletedIds.push(id);
            } catch (error) { console.error(`[Firestore deleteMany] Error deleting ${resource}/${id}:`, error); }
        }
        return { data: deletedIds };
    }
};

// --- Wrapper DataProvider (Utama) ---
const dataProvider = {
    getList: (resource, params) => {
        if (['users', 'mentors'].includes(resource)) { 
            return firestoreDataProvider.getList(resource, params);
        }
        if (resource === 'favorites') {
           
            if (!params.filter || !params.filter.userId) {
                console.warn('[dataProvider] User ID filter is required to get favorites from Django.');
                return Promise.resolve({ data: [], total: 0 });
            }
            return djangoDataProvider.getList(resource, params);
        }
        return djangoDataProvider.getList(resource, params);
    },
    getOne: (resource, params) => { 
        if (resource === 'favorites') {
            return djangoDataProvider.getOne(resource, params); 
        }
        if (['users', 'mentors'].includes(resource)) {
            return firestoreDataProvider.getOne(resource, params);
        }
        return djangoDataProvider.getOne(resource, params);
    },
    getMany: (resource, params) => {
        if (['users', 'mentors', 'favorites'].includes(resource)) {
            return firestoreDataProvider.getMany(resource, params);
        }
        return djangoDataProvider.getMany(resource, params);
    },
    getManyReference: (resource, params) => {
        if (resource === 'favorites') {
            // params.id di sini akan berisi UID Firebase dari pengguna yang dipilih
            return djangoDataProvider.getManyReference(resource, params);
        }
        if (['users', 'mentors'].includes(resource)) {
            return firestoreDataProvider.getManyReference(resource, params);
        }
        return djangoDataProvider.getManyReference(resource, params); 
    },
    create: (resource, params) => {
        if (resource === 'favorites') {
            
            return djangoDataProvider.create(resource, params);
        }
        if (['users', 'mentors'].includes(resource)) {
            return firestoreDataProvider.create(resource, params);
        }
        return djangoDataProvider.create(resource, params);
    },
    update: (resource, params) => {
        if (resource === 'favorites') {
            return djangoDataProvider.update(resource, params);
        }
        if (['users', 'mentors'].includes(resource)) {
            return firestoreDataProvider.update(resource, params);
        }
        return djangoDataProvider.update(resource, params);
    },
    delete: (resource, params) => {
        if (resource === 'favorites') {
            return djangoDataProvider.delete(resource, params);
        }
        if (['users', 'mentors'].includes(resource)) {
            return firestoreDataProvider.delete(resource, params);
        }
        return djangoDataProvider.delete(resource, params);
    },
    updateMany: (resource, params) => {
        if (['users', 'mentors', 'favorites'].includes(resource)) {
            return firestoreDataProvider.updateMany(resource, params);
        }
        return djangoDataProvider.updateMany(resource, params);
    },
    deleteMany: (resource, params) => {
        if (['users', 'mentors', 'favorites'].includes(resource)) {
            return firestoreDataProvider.deleteMany(resource, params);
        }
        return djangoDataProvider.deleteMany(resource, params);
    }
};

const convertTimestampsAndDateStringsToDates = (docData) => {
    const data = { ...docData };
    for (const key in data) {
        if (data[key] && typeof data[key].toDate === 'function') { // Firestore Timestamp
            data[key] = data[key].toDate();
        } else if (key === 'birth' && typeof data[key] === 'string' && !isNaN(new Date(data[key]))) { 
            data[key] = new Date(data[key]);
        }
    }
    return data;
};


export default dataProvider;
