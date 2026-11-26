import {useEffect,useRef} from 'react';
import {useStoreVersion} from '../hooks/useStoreVersion';
import Store from '../lib/store/gymakStore';
import {dataOwner} from '../lib/guestImport';
import {getChatProfile,uploadChatAvatar,importDefaultChatAvatar} from '../lib/chatIdentity';
import {compressImageToBlob} from '../lib/imageCompress';
export default function DefaultChatAvatarSync({userId}){const [version]=useStoreVersion(),last=useRef(null);useEffect(()=>{let live=true;const photo=Store.getProfile().avatar;if(!userId||dataOwner()!==userId||!photo||last.current===userId+photo)return;last.current=userId+photo;(async()=>{try{const p=await getChatProfile(userId);if(!live||!p?.visible||p.avatar_path||dataOwner()!==userId)return;const response=await fetch(photo);if(!response.ok)return;let blob=await compressImageToBlob(await response.blob(),320,.65);if(blob.size>102400)blob=await compressImageToBlob(blob,240,.5);if(!live||dataOwner()!==userId)return;const path=await uploadChatAvatar(userId,blob);if(live&&dataOwner()===userId)await importDefaultChatAvatar(path);}catch{last.current=null;}})();return()=>{live=false;if(last.current===userId+photo)last.current=null;};},[userId,version]);return null;}
