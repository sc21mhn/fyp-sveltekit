import { getContext, onDestroy, setContext } from 'svelte';

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

// // https://github.com/supabase/supabase/issues/8490#issuecomment-1219766620
// function createServerDbClient(accessToken) {
// 	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
// 		db: {
// 			schema: 'public',
// 		},
// 		auth: {
// 			persistSession: false,
// 			autoRefreshToken: false,
// 		},
// 		global: {
// 			headers: accessToken ? {
// 				Authorization: `Bearer ${accessToken}`,
// 			} : null,
// 		},
// 	});
// }

// const KEY = Symbol('SUPABASE');

// export function setClientWithToken(token) {
// 	return setContext(KEY, createServerDbClient(token));
// }

// export function getSupabaseClient() {
// 	return getContext(KEY);
// }

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
