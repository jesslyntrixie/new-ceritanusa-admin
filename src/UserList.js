import React from 'react';
import { List, Datagrid, TextField, EmailField, DateField, FunctionField } from 'react-admin';


export const UserList = (props) => (
    <List {...props}>
        <Datagrid rowClick="edit"> 
            <TextField source="id" />
            <TextField source="userName" label="Name" /> 
            <EmailField source="email" />
            <TextField source="role" />
            <DateField source="birth" label="Birth Date" locales="id-ID" options={{ year: 'numeric', month: 'long', day: 'numeric' }} />
            <FunctionField
                label="Raw Birth Value"
                render={record => {
                    console.log(`Record ID: ${record.id}, Birth Value:`, record.birth);
                    if (record.birth && typeof record.birth.toDate === 'function') {
                        // Ini adalah Firestore Timestamp
                        return `Timestamp: ${record.birth.toDate().toLocaleDateString('id-ID')}`;
                    }
                    return record.birth ? String(record.birth) : 'null atau undefined';
                }}
            />
        </Datagrid>
    </List>
);
