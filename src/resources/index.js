import {
  List,
  Datagrid,
  TextField,
  DateField,
  Edit,
  SimpleForm,
  TextInput,
  Create,
  ImageField,
  ImageInput,
  ArrayInput,
  SimpleFormIterator,
  BooleanInput,
  ReferenceField,
  ReferenceInput,
  SelectInput,
  FunctionField
} from 'react-admin';


// Artikel
export const ArtikelList = (props) => (
   <List {...props}>
        <Datagrid rowClick="edit">
            <TextField source="title" />
            <TextField source="author" />
            <DateField source="created_at" />

            {/* Komponen ImageField asli Anda, bisa Anda komentari atau hapus jika FunctionField di bawah sudah cukup */}
            {/* <ImageField source="image" title="title" /> */}

            {/* Menggunakan FunctionField untuk logging dan kemudian merender ImageField */}
            <FunctionField
                label="Image Debug"
                render={record => {
                    console.log('[ArtikelList] Rendering record.image:', record.image);
                    console.log('[ArtikelList] typeof record.image:', typeof record.image);
                    // Anda bisa kembalikan <ImageField> di sini jika record.image adalah string
                    if (record.image && typeof record.image === 'string') {
                        return <ImageField record={record} source="image" title="title" />;
                    }
                    return <span>{typeof record.image === 'object' ? 'Image is an object!' : 'No image string'}</span>;
                }}
            />
        </Datagrid>
    </List>
);

export const ArtikelEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="title" />
      <TextInput source="author" />
      <TextInput multiline source="content" />
      <ImageInput source="image" accept="image/*">
        <ImageField source="src" title="title" />
      </ImageInput>
    </SimpleForm>
  </Edit>
);

export const ArtikelCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="title" />
      <TextInput source="author" />
      <TextInput multiline source="content" />
      <ImageInput source="image" accept="image/*">
        <ImageField source="src" title="title" />
      </ImageInput>
    </SimpleForm>
  </Create>
);

// Chat
export const ChatList = (props) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <TextField source="sender" />
      <TextField source="receiver" />
      <TextField source="message" />
      <DateField source="timestamp" />
    </Datagrid>
  </List>
);

export const ChatEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="sender" />
      <TextInput source="receiver" />
      <TextInput multiline source="message" />
    </SimpleForm>
  </Edit>
);

export const ChatCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="sender" />
      <TextInput source="receiver" />
      <TextInput multiline source="message" />
    </SimpleForm>
  </Create>
);

// Quiz
export const QuizList = (props) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="description" />
      <DateField source="created_at" />
    </Datagrid>
  </List>
);


export const QuizEdit = (props) => (
    <Edit {...props}>
        <SimpleForm>
            <TextInput source="title" />
            <TextInput source="description" multiline />
            <ArrayInput source="questions" label="Questions">
                <SimpleFormIterator>
                    <TextInput source="text" label="Question Text" fullWidth />

                    {/* BAGIAN UNTUK MENAMPILKAN GAMBAR YANG SUDAH ADA */}
                    {/* 'image' di sini adalah field yang berisi URL gambar dari backend */}
                    <ImageField source="image" title="Current Image" label="Current Question Image" sx={{ '& img': { maxWidth: 200, maxHeight: 200, objectFit: 'contain' } }} />

                    {/* BAGIAN UNTUK UPLOAD ATAU MENGGANTI GAMBAR */}
                    <ImageInput source="image" label="New/Change Question Image" accept="image/*">
                        <ImageField source="src" title="title" />
                    </ImageInput>

                    <ArrayInput source="choices" label="Choices">
                        <SimpleFormIterator>
                            <TextInput source="text" label="Choice Text" />
                            <BooleanInput source="is_correct" label="Is Correct?" />
                        </SimpleFormIterator>
                    </ArrayInput>
                </SimpleFormIterator>
            </ArrayInput>
        </SimpleForm>
    </Edit>
);

export const QuizCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="title" />
      <TextInput source="description" />
      <ArrayInput source="questions">
        <SimpleFormIterator>
          <TextInput source="text" />
          <ImageInput source="image" accept="image/*">
            <ImageField source="src" />
          </ImageInput>
          <ArrayInput source="choices">
            <SimpleFormIterator>
              <TextInput source="text" />
              <BooleanInput source="is_correct" />
            </SimpleFormIterator>
          </ArrayInput>
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);

// Favorite
export const FavoriteList = (props) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <ReferenceField source="article_id" reference="artikels">
        <TextField source="title" />
      </ReferenceField>
      <TextField source="user_id" />
      <DateField source="created_at" />
    </Datagrid>
  </List>
);

export const FavoriteEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <ReferenceInput source="article_id" reference="artikels">
        <SelectInput optionText="title" />
      </ReferenceInput>
      <TextInput source="user_id" />
    </SimpleForm>
  </Edit>
);

// Summary
export const SummaryList = (props) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <ReferenceField source="article_id" reference="artikels">
        <TextField source="title" />
      </ReferenceField>
      <TextField source="summarized_text" />
      <DateField source="created_at" />
    </Datagrid>
  </List>
);

export const SummaryEdit = (props) => (
  <Edit {...props}>
    <SimpleForm>
      <ReferenceInput source="article_id" reference="artikels">
        <SelectInput optionText="title" />
      </ReferenceInput>
      <TextInput multiline source="original_text" />
      <TextInput multiline source="summarized_text" />
    </SimpleForm>
  </Edit>
);

export const SummaryCreate = (props) => (
  <Create {...props}>
    <SimpleForm>
      <ReferenceInput source="article_id" reference="artikels">
        <SelectInput optionText="title" />
      </ReferenceInput>
      <TextInput multiline source="original_text" />
    </SimpleForm>
  </Create>
);