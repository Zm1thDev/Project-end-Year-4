
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Loginpage from './components/Loginpage';
import Loginadmin from './components/Loginadmin';
import Upload from './components/pages/Upload';
import Search from './components/pages/search';
import Adminpage from './components/pages/Adminpage';
import { GoogleOAuthProvider } from '@react-oauth/google';
const client_id = process.env.REACT_APP_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={client_id}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Loginpage />} />
          <Route path='/teacher' element={<Upload/>} />
          <Route path='/student' element={<Search />} />
          <Route path='/admin-login' element={<Loginadmin />} />
          <Route path='/admin' element={<Adminpage />} />
        </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
