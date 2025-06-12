import React from 'react';
import { Edit, SimpleForm, TextInput, SelectInput, DateInput } from 'react-admin';

export const UserEdit = (props) => (
    <Edit {...props} title="Edit User">
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="userName" label="User Name" />
            <TextInput source="email" type="email" />
            <SelectInput source="role" choices={[
                { id: 'user', name: 'User' },
                { id: 'admin', name: 'Admin' },
                { id: 'mentor', name: 'Mentor' }, 
            ]} />
            <TextInput source="photoUrl" label="Photo URL" />
            <DateInput source="birth" label="Birth Date" />
        </SimpleForm>
    </Edit>
);





