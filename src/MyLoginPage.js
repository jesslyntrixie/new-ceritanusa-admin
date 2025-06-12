import * as React from 'react';
import { Login, TextInput } from 'react-admin';
import { CardContent } from '@mui/material'; // Opsional, untuk padding standar jika diperlukan

const MyLoginPage = props => (
    <Login {...props}>
        {/* Komponen <Login> dari react-admin akan menangani logika form,
            termasuk tombol submit dan pemanggilan authProvider.login.
            Kita hanya perlu menyediakan input field di sini.
            Input-input ini akan menggantikan input default dari <Login>.
        */}
        <CardContent> {/* Opsional: agar ada padding seperti form default */}
            <TextInput
                autoFocus
                source="username" 
                label="Alamat Email" 
                fullWidth
            />
            <TextInput
                source="password" 
                label="Password"   
                type="password"
                
                fullWidth
                
            />
        </CardContent>
        {/* Tombol submit akan dirender secara otomatis oleh komponen <Login> */}
    </Login>
);

export default MyLoginPage;
