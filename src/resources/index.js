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

const API_URL = 'https://web-production-06f9.up.railway.app';

export const resolveImageUrl = (url) => {
  if (typeof url === 'string' && url.startsWith('/api')) {
    return `${API_URL}${url}`;
  }
  return url;
};

// Artikel
export const ArtikelList = (props) => (
   <List {...props}>
        <Datagrid rowClick="edit">
            <TextField source="title" />
            <TextField source="author" />
            <DateField source="created_at" />

          
            <FunctionField
                label="Image Debug"
                render={record => {
                    console.log('[ArtikelList] Rendering record.image:', record.image);
                    console.log('[ArtikelList] typeof record.image:', typeof record.image);

                    const imageUrl = resolveImageUrl(record.image);
                    if (imageUrl) {
                        return <img src={imageUrl} alt="thumbnail" style={{ width: 100 }} />;
                    }
                    return <span>No image</span>;
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

                  
                    <ImageField source="image" title="Current Image" label="Current Question Image" sx={{ '& img': { maxWidth: 200, maxHeight: 200, objectFit: 'contain' } }} />

                   
                    <ImageInput source="image" label="New/Change Question Image" accept="image/*">
                        <ImageField source="src" title="title" />
                    </ImageInput>
                    <FunctionField
                      label="Quiz Image"
                      render={record => {
                        const imageUrl = resolveImageUrl(record.image);
                        return imageUrl ? (
                          <img src={imageUrl} alt="Quiz" style={{ width: 100 }} />
                        ) : (
                          <span>No image</span>
                        );
                      }}
                    />
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
