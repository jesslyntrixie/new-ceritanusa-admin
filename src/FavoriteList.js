import React from 'react';
import { List, Datagrid, TextField, ReferenceField, DateField, useRecordContext } from 'react-admin';

// Helper untuk format timestamp Firestore jika perlu
const FirebaseTimestampField = (props) => {
    const record = useRecordContext(props);
    const date = record[props.source];
    if (!date || !date.seconds) return null; // Timestamp Firestore punya .seconds
    return <DateField record={{ ...record, [props.source]: new Date(date.seconds * 1000) }} {...props} />;
};
export const FavoriteList = (props) => (
  <List {...props} title="My Favorites" /* filterDefaultValues={{ userId: auth.currentUser?.uid }} // Ini tidak perlu jika filter di dataProvider */ >
    <Datagrid>
      {/* ID dokumen favorit di Firestore, mungkin tidak perlu ditampilkan ke user */}
      {/* <TextField source="id" label="Favorite Doc ID" /> */}

      {/* userId mungkin tidak perlu ditampilkan jika list ini sudah difilter untuk user tertentu */}
      {/* <TextField source="userId" label="User ID" /> */}

      <ReferenceField label="Artikel yang Difavoritkan" source="articleId" reference="artikels" link="show">
        <TextField source="title" />
      </ReferenceField>
      <FirebaseTimestampField source="createdAt" label="Tanggal Difavoritkan" showTime />
      {/* Tambahkan tombol delete jika perlu */}
    </Datagrid>
  </List>
);