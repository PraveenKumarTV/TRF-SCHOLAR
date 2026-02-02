import {Routes,Route} from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MonthlyClaimForm from './pages/MonthlyClaimForm.jsx';
import Publications from './pages/Publications.jsx';
import UpdateBankDetails from './pages/UpdateBankDetails.jsx';
//import Layout from './components/Layout.jsx';
const App=()=>{
  return(
    <Routes>
      <Route path='/' element={<Login/>}/>
      <Route path='/Dashboard' element={<Dashboard/>}/>
      <Route path='/MonthlyClaimForm' element={<MonthlyClaimForm/>}/>
      <Route path='/Publications' element={<Publications/>}/>
      <Route path='/UpdateBankDetails' element={<UpdateBankDetails/>}/>
      {/* <Route path='/Layout' element={<Layout/>}/> */}
    </Routes>
  )
}
export default App;