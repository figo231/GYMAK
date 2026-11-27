import {Navigate,useLocation} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import GuestImportGate from './GuestImportGate';
export default function ProtectedRoute({children}){
 const {user,loading,isPasswordRecovery,guestImport}=useAuth();const location=useLocation();
 if(loading)return <div className="bg-ambient"/>;
 if(!user||isPasswordRecovery)return <Navigate to="/auth/login" state={{from:location.pathname+location.search+location.hash}} replace/>;
 if(guestImport?.status==='ready'&&guestImport.userId!==user.id)return <div className="bg-ambient"/>;
 if(guestImport&&guestImport.status!=='ready')return <GuestImportGate/>;
 return children;
}
