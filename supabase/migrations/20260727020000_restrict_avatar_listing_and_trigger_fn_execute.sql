-- Follow-up to the 2026-07-27 audit: clear the remaining Supabase linter
-- findings that were genuine (see the audit notes for the two that are
-- intentional and documented rather than fixed).

-- Trigger / event-trigger functions are never meant to be called as RPCs.
-- Triggers fire as the table owner, so revoking EXECUTE does not affect them.
revoke execute on function public.handle_new_user()  from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()  from public, anon, authenticated;

-- The avatars bucket is public, so object URLs are served without consulting
-- RLS. The broad SELECT policy only added the ability to ENUMERATE every file
-- in the bucket, which nothing in the app does (it builds URLs client-side via
-- getPublicUrl). Scope listing to the user's own folder.
drop policy if exists "avatars_public_read" on storage.objects;

create policy "avatars_owner_list"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
