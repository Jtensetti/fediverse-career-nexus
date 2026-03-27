

# Fix 3 Security Issues

## 1. `cv_sections` — public read without auth
**Issue**: SELECT policy allows anyone (including unauthenticated) to read all CV sections.
**Fix**: Replace the permissive `true` policy with `auth.uid() = user_id` so users can only read their own CV sections. Since `cv_sections` isn't used anywhere in frontend code currently, this won't break anything. If public profile viewing needs CV data later, a visibility-aware policy can be added.

**Migration**:
```sql
DROP POLICY IF EXISTS "Anyone can view cv sections" ON public.cv_sections;
CREATE POLICY "Users can view own cv sections"
  ON public.cv_sections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

## 2. `user_achievements` — unrestricted INSERT
**Issue**: INSERT policy with `true` on public role lets anyone grant achievements to any user.
**Fix**: Remove the permissive public INSERT policy and replace with a service-role-only approach. Since achievements should be granted by backend logic, restrict INSERT to authenticated users inserting their own rows (or remove client insert entirely).

**Migration**:
```sql
DROP POLICY IF EXISTS "System can grant achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```
(Service role bypasses RLS, so backend/edge functions can still grant achievements.)

## 3. `remote_actors_cache` — public write access
**Issue**: ALL policy with `true` on public role lets unauthenticated users write/delete cache entries.
**Fix**: Split into read-only public policy + authenticated write. The client-side write in `actorService.ts` runs as an authenticated user, so an authenticated INSERT/UPDATE policy suffices. Edge functions use service role which bypasses RLS.

**Migration**:
```sql
DROP POLICY IF EXISTS "Service can manage remote actors cache" ON public.remote_actors_cache;

CREATE POLICY "Anyone can read remote actors cache"
  ON public.remote_actors_cache FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert remote actors cache"
  ON public.remote_actors_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update remote actors cache"
  ON public.remote_actors_cache FOR UPDATE
  TO authenticated
  USING (true);
```

---

**No code changes needed** — only 1 database migration with policy updates. No functionality will break.

