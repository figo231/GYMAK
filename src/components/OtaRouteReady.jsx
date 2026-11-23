import {useEffect} from 'react';
export default function OtaRouteReady({children}){
 useEffect(()=>{document.documentElement.setAttribute('data-gymak-route-ready','1');return()=>{document.documentElement.removeAttribute('data-gymak-route-ready');};},[]);
 return children;
}
