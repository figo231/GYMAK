-- FAKE data only. Generated values, no real user, email or photo. Runs on a throwaway database.
-- Best effort generic seeder: up to 3 rows per public table, foreign keys follow existing rows.
-- Tables it cannot fill (strict CHECK rules) are reported so the coverage is visible.
insert into auth.users(id,email,raw_user_meta_data)
select gen_random_uuid(),'fake'||g||'@example.invalid',jsonb_build_object('display_name','Fake '||g) from generate_series(1,3) g;

create function pg_temp.fake_val(typ text, udt text, n int, col text) returns text language sql as $$
  select case
    when typ in ('integer','bigint','smallint','numeric','double precision','real') then (n+1)::text
    when typ='boolean' then 'false'
    when typ='uuid' then quote_literal(gen_random_uuid()::text)
    when typ like 'timestamp%' then quote_literal(now()::text)
    when typ='date' then quote_literal(current_date::text)
    when typ like 'time%' then quote_literal('12:00')
    when typ in ('jsonb','json','ARRAY') then quote_literal(case when typ='ARRAY' then '{}' else '{}' end)
    when typ='USER-DEFINED' then coalesce((select quote_literal(e.enumlabel) from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname=udt order by e.enumsortorder limit 1),'null')
    else quote_literal('fake-'||col||'-'||n) end $$;

create function pg_temp.seed_one(tbl regclass, n int) returns boolean language plpgsql as $$
declare c record; cols text:=''; vals text:=''; v text; fk record;
begin
  for c in select a.attname, format_type(a.atttypid,null) as ft, t.typname as udt, a.attnotnull, a.atthasdef, a.attgenerated, a.attidentity, a.attnum
           from pg_attribute a join pg_type t on t.oid=a.atttypid where a.attrelid=tbl and a.attnum>0 and not a.attisdropped order by a.attnum loop
    continue when c.attgenerated<>'' or c.attidentity<>'';
    select con.confrelid::regclass as rt, (select attname from pg_attribute where attrelid=con.confrelid and attnum=con.confkey[1]) as rc into fk
      from pg_constraint con where con.conrelid=tbl and con.contype='f' and array_length(con.conkey,1)=1 and con.conkey[1]=c.attnum limit 1;
    if fk.rt is not null then
      v:=format('(select %I from %s order by 1 offset %s limit 1)',fk.rc,fk.rt,n%3);
    else
      continue when c.atthasdef or not c.attnotnull;
      v:=pg_temp.fake_val(case when c.ft like 'character%' then 'text' when c.ft like 'timestamp%' then 'timestamp' else c.ft end,c.udt,n,c.attname);
    end if;
    cols:=cols||case when cols='' then '' else ',' end||quote_ident(c.attname);
    vals:=vals||case when vals='' then '' else ',' end||v;
  end loop;
  if cols='' then execute format('insert into %s default values',tbl); else execute format('insert into %s(%s) values(%s)',tbl,cols,vals); end if;
  return true;
exception when others then return false;
end $$;

do $$
declare t record; n int; p int; have int; filled int:=0; empty text[]:='{}';
begin
  for p in 1..4 loop
    for t in select c.oid::regclass as r, c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relkind='r' order by c.relname loop
      execute format('select count(*) from %s',t.r) into have;
      continue when have>=3;
      for n in have..2 loop
        exit when not pg_temp.seed_one(t.r,n);
      end loop;
    end loop;
  end loop;
  for t in select c.oid::regclass as r, c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relkind='r' order by c.relname loop
    execute format('select count(*) from %s',t.r) into have;
    if have>0 then filled:=filled+1; else empty:=empty||t.relname; end if;
  end loop;
  raise notice 'SEED: % tables with fake rows, % empty: %',filled,array_length(empty,1),empty;
end $$;
