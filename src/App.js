import React from 'react';
import { Admin, Resource } from 'react-admin';
import dataProvider from './dataProvider';
import authProvider from './authProvider';
import MyLoginPage from './MyLoginPage';
import {
  ArtikelList, ArtikelEdit, ArtikelCreate,
  ChatList, ChatEdit, ChatCreate,
  QuizList, QuizEdit, QuizCreate,
  SummaryList, SummaryEdit, SummaryCreate
} from './resources'; // Pastikan path ini benar

// Impor untuk komponen resource Firebase BARU Anda
import { UserList } from './UserList'; 

import { UserEdit } from './UserEdit';
import { UserShow } from './UserShow'; 

// Impor untuk ikon
import {
  Article,
  Chat,
  Quiz,
  Favorite, 
  Summarize,
  People 
} from '@mui/icons-material';
  

const App = () => (
   <Admin 
    dataProvider={dataProvider} 
    authProvider={authProvider}
    // loginPage={MyLoginPage} // ]
  >

    {/* Resource untuk data dari Firebase */}
    <Resource name="users" list={UserList} icon={People} edit={UserEdit} show={UserShow}/> 
    {/* <Resource name="favorites" icon={Favorite} /> */}
    <Resource
      name="artikels"
      list={ArtikelList}
      edit={ArtikelEdit}
      create={ArtikelCreate}
      icon={Article}
      show={UserShow}
    />
    <Resource
      name="chats"
      list={ChatList}
      edit={ChatEdit}
      create={ChatCreate}
      icon={Chat}
    />
    <Resource
      name="quizzes"
      list={QuizList}
      edit={QuizEdit}
      create={QuizCreate}
      icon={Quiz}
    />

    <Resource
      name="summaries"
      list={SummaryList}
      edit={SummaryEdit}
      create={SummaryCreate}
      icon={Summarize}
    />
  </Admin>
);

export default App;