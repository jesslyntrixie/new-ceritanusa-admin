// src/MyLoginPage.js
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
                source="username" // PENTING: 'source' harus tetap "username" karena itu yang diharapkan oleh authProvider Anda
                label="Alamat Email" // INI LABEL BARU ANDA
                // Anda bisa menambahkan validasi jika perlu, contoh:
                // validate={required('Email tidak boleh kosong')}
                fullWidth
                // required // Atribut HTML5 untuk input wajib diisi
            />
            <TextInput
                source="password" // 'source' harus "password"
                label="Password"   // Anda juga bisa ganti ini jika mau, misal "Kata Sandi"
                type="password"
                // validate={required('Password tidak boleh kosong')}
                fullWidth
                // required
            />
        </CardContent>
        {/* Tombol submit akan dirender secara otomatis oleh komponen <Login> */}
    </Login>
);

export default MyLoginPage;