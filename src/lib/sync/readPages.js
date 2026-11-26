// Keyset pages avoid the API's default row cap without unstable offset windows.
// Merge only after the whole read succeeds, so a failed page cannot look complete.
export async function readOwnerRows(client,table,owner,{columns='*',key='id',pageSize=500,canRead=()=>true}={}) {
 const rows=[];let after=null;
 while(canRead()) {
  let query=client.from(table).select(columns).eq('user_id',owner).order(key,{ascending:true}).limit(pageSize);
  if(after!==null)query=query.gt(key,after);
  const {data,error}=await query;if(error)throw error;
  if(!canRead())return [];
  const page=data||[];rows.push(...page);
  if(page.length<pageSize)return rows;
  const next=page.at(-1)?.[key];
  if(next==null||next===after)throw Error('sync_page_cursor_invalid');
  after=next;
 }
 return [];
}
