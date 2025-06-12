// Contoh di UserShow.js
import { Show, SimpleShowLayout, TextField, ReferenceManyField, Datagrid, Pagination } from 'react-admin';
// Pastikan Anda juga mengimpor field lain yang mungkin dibutuhkan, seperti DateField, etc.

export const UserShow = (props) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="id" label="User Firebase UID" /> {/* Pastikan 'id' adalah field UID dari Firestore user */}
            <TextField source="userName" label="Name" /> {/* Sesuaikan dengan field user Anda */}
            <TextField source="email" /> {/* Sesuaikan dengan field user Anda */}
            {/* Field user lainnya */}

            <ReferenceManyField
                label="User Favorites (from Django)"
                reference="favorites" // Resource "favorites"
                target="userId"     // Ini akan digunakan oleh React Admin secara internal,
                                    // namun untuk URL API Django, kita akan mengandalkan `params.id`
                                    // di dalam `djangoDataProvider.getManyReference` yang berasal dari `source="id"` di bawah.
                source="id"         // Ini KUNCI: 'id' dari record User (Firebase UID) akan dikirim sebagai `params.id`
                                    // ke `dataProvider.getManyReference`.
                pagination={<Pagination />}
                perPage={10}
            >
                <Datagrid>
                    <TextField source="id" label="Favorite ID (Django)" />
                    <TextField source="article_id" label="Article ID (Django)" /> {/* Sesuaikan dengan field di FavoriteSerializer Anda */}
                    {/* <TextField source="user_id" label="User ID Favorit" />  Mungkin tidak perlu ditampilkan lagi di sini */}
                    {/* Tambahkan field lain dari FavoriteSerializer Anda jika perlu */}
                </Datagrid>
            </ReferenceManyField>
        </SimpleShowLayout>
    </Show>
);