// Presentation only. Uploads, stored images, and signed URL access are unchanged.
export default function AvatarImage({src,alt='',onError}){
 return <img src={src} alt={alt} onError={onError}/>;
}
