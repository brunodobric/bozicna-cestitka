-- Mail kupcu nakon uplate (Resend, src/lib/mail.ts). Pokreće se ručno u Supabase SQL Editoru, nakon 001 do 006.
-- Smije se pokrenuti više puta.
--
-- Uplatu potvrđuju i webhook i povratak s naplate, pa se mail mora poslati samo jednom:
-- Worker prvo "zauzme" slanje (mail_za_uplatu postavi mail_poslan), a ako slanje ne uspije, vrati ga (mail_nije_poslan).

alter table public.uplate add column if not exists mail_poslan timestamptz;

-- Vraća podatke za mail i označi da je poslan. Ako je već poslan (ili nema adrese), ne vraća ništa.
create or replace function public.mail_za_uplatu(p_secret text, p_session_id text)
returns table (email text, za text, token text, uredi_token text, brisanje_nakon date, komada integer)
language plpgsql volatile security definer set search_path = public as $$
begin
  if coalesce(p_secret, '') = ''
     or p_secret is distinct from (select value from public.private_settings where key = 'placanje_secret') then
    raise exception 'zabranjeno';
  end if;
  return query
    with z as (
      update public.uplate u set mail_poslan = now()
       where u.stripe_session_id = p_session_id and u.mail_poslan is null
       returning u.cestitka_id, u.email, u.komada
    )
    select coalesce(nullif(z.email, ''), c.email_kupca), c.za, c.token, c.uredi_token, c.brisanje_nakon, z.komada
      from z join public.cestitke c on c.id = z.cestitka_id
     where coalesce(nullif(z.email, ''), c.email_kupca) <> '';
end;
$$;
revoke all on function public.mail_za_uplatu(text, text) from public;
grant execute on function public.mail_za_uplatu(text, text) to anon, authenticated;

-- Slanje nije uspjelo: sljedeći poziv (ponovljeni webhook) pokuša opet.
create or replace function public.mail_nije_poslan(p_secret text, p_session_id text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if coalesce(p_secret, '') = ''
     or p_secret is distinct from (select value from public.private_settings where key = 'placanje_secret') then
    raise exception 'zabranjeno';
  end if;
  update public.uplate set mail_poslan = null where stripe_session_id = p_session_id;
end;
$$;
revoke all on function public.mail_nije_poslan(text, text) from public;
grant execute on function public.mail_nije_poslan(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
