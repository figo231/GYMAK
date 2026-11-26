import sys,struct,json, pathlib,time
def crc32c(data):
 crc=0xffffffff
 for byte in data:
  crc^=byte
  for _ in range(8):crc=(crc>>1)^(0x82f63b78 if crc&1 else 0)
 return crc^0xffffffff
def masked(data):
 c=crc32c(data);return (((c>>15)|(c<<17))+0xa282ead8)&0xffffffff
root=pathlib.Path(sys.argv[1]);candidate=sys.argv[2];records=[]
def varint(b,p):
 n=0;s=0
 while True:
  x=b[p];p+=1;n|=(x&127)<<s
  if x<128:return n,p
  s+=7
for f in root.rglob('*.log'):
 try:
  b=f.read_bytes();p=0;fragments=b''
  while p+7<=len(b):
   blockend=((p//32768)+1)*32768
   if blockend-p<7:p=blockend;continue
   crc,length,kind=struct.unpack_from('<IHB',b,p);p+=7
   if length==0 and kind==0:p=blockend;continue
   if p+length>len(b) or p+length>blockend:break
   data=b[p:p+length];p+=length
   if masked(bytes([kind])+data)!=crc:raise ValueError('WAL CRC32C mismatch')
   if kind==1:entry=data
   elif kind==2:fragments=data;continue
   elif kind==3:fragments+=data;continue
   elif kind==4:entry=fragments+data;fragments=b''
   else:continue
   if len(entry)<12:continue
   seq,count=struct.unpack_from('<QI',entry,0);q=12
   for i in range(count):
    typ=entry[q];q+=1;size,q=varint(entry,q);key=entry[q:q+size];q+=size;value=b''
    if typ==1:size,q=varint(entry,q);value=entry[q:q+size];q+=size
    if b'gymak_ota_staged_v1' in key or 'gymak_ota_staged_v1'.encode('utf-16le')in key:
     records.append({'sequence':seq+i,'type':typ,'file':f.name,'candidatePresent':candidate.encode()in value or candidate.encode('utf-16le')in value,'keyHex':key.hex(),'valueHex':value.hex()})
 except Exception as e:records.append({'parseError':str(e),'file':str(f)})
valid=[x for x in records if 'sequence'in x];latest=max(valid,key=lambda x:x['sequence'])if valid else None
result={'at':time.time(),'records':records,'latest':latest,'candidateRecordedInWAL':bool(latest and latest['type']==1 and latest['candidatePresent']),'scope':'Read-only copied LevelDB WAL write batches. Kernel-visible file evidence, not power-loss fsync guarantee; SST not decoded.'}
print(json.dumps(result,indent=2));sys.exit(0 if result['candidateRecordedInWAL'] else 2)
