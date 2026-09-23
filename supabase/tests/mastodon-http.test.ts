import { strict as assert } from 'node:assert';
import { handleMastodonRequest } from '../functions/mastodon-api/handler.ts';
import { handleOAuthRequest } from '../functions/oauth-authorization-server/handler.ts';
import { tokenHash } from '../functions/_shared/oauth.ts';

const clientId='88888888-eeee-4eee-8eee-eeeeeeeeeeee';
const userId='88888888-1111-4111-8111-111111111111';
const actorId='88888888-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sessionId='88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const client={id:clientId,name:'Fixture app',website:'https://app.example',redirect_uris:['tusky://oauth'],scopes:['read','write']};
type Call={url:URL;method:string;body:Record<string,unknown> | null};
async function withBackend(run:(calls:Call[])=>Promise<void>, reply:(call:Call)=>unknown) {
  const settings:Record<string,string>={SUPABASE_URL:'https://fixture.example',SUPABASE_ANON_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',MASTODON_CLIENT_ENABLED:'true',MASTODON_CLIENT_PILOT_USER_IDS:'',SITE_URL:'https://nolto.social',FEDERATION_DOMAIN:'nolto.social'};
  const old=new Map(Object.keys(settings).map(key=>[key,Deno.env.get(key)]));
  for (const [key,value] of Object.entries(settings)) Deno.env.set(key,value);
  const original=globalThis.fetch; const calls:Call[]=[];
  globalThis.fetch=(input,init)=> {
    const url=new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin,'https://fixture.example','test must never contact an external service');
    const call={url,method:init?.method || 'GET',body:typeof init?.body==='string' ? JSON.parse(init.body) : null};
    calls.push(call);
    const data=reply(call);
    return Promise.resolve(data instanceof Response ? data : new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}}));
  };
  try { await run(calls); }
  finally { globalThis.fetch=original; for (const [key,value] of old) { if (value===undefined) Deno.env.delete(key); else Deno.env.set(key,value); } }
}
const jsonRequest=(functionName:string,path:string,body:unknown,headers:Record<string,string>={})=>new Request('https://fixture.example/functions/v1/'+functionName+'/'+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});

Deno.test('OAuth consent and token transport bind app, user, session and callback without releasing a Nolto JWT', async()=> {
  const jwt=btoa('{}')+'.'+btoa(JSON.stringify({sub:userId,session_id:sessionId,aal:'aal1'}))+'.fixture';
  let issue:Record<string,unknown> | undefined; let exchange:Record<string,unknown> | undefined;
  await withBackend(async calls=> {
    const input={client_id:clientId,redirect_uri:'tusky://oauth',response_type:'code',scope:'read write',state:'caller-state',code_challenge:'P'.repeat(43),code_challenge_method:'S256'};
    const metadata=await handleOAuthRequest(new Request('https://fixture.example/functions/v1/oauth-authorization-server/request?'+new URLSearchParams(input)));
    assert.equal(metadata.status,200); const preview=await metadata.json(); assert.equal(preview.client.name,'Fixture app'); assert.equal(preview.client.secret_hash,undefined);
    const denied=await handleOAuthRequest(jsonRequest('oauth-authorization-server','consent',{...input,decision:'allow'},{origin:'https://evil.example',authorization:'Bearer '+jwt}));
    assert.equal(denied.status,403); assert.equal(calls.filter(call=>call.url.pathname.endsWith('/mastodon_issue_code')).length,0);
    const consent=await handleOAuthRequest(jsonRequest('oauth-authorization-server','consent',{...input,decision:'allow'},{origin:'https://nolto.social',authorization:'Bearer '+jwt}));
    assert.equal(consent.status,200); const destination=new URL((await consent.json()).redirect); const code=destination.searchParams.get('code')!;
    assert.equal(destination.protocol,'tusky:'); assert.equal(destination.searchParams.get('state'),'caller-state'); assert.match(code,/^[0-9a-f]{64}$/);
    assert.equal(issue?.p_user,userId); assert.equal(issue?.p_session,sessionId); assert.equal(issue?.p_hash,await tokenHash(code)); assert.notEqual(issue?.p_hash,code);
    const secret='a'.repeat(64);
    const tokenResponse=await handleOAuthRequest(jsonRequest('oauth-authorization-server','token',{client_id:clientId,client_secret:secret,grant_type:'authorization_code',redirect_uri:'tusky://oauth',code,code_verifier:'V'.repeat(43)}));
    assert.equal(tokenResponse.status,200); const result=await tokenResponse.json();
    assert.match(result.access_token,/^[0-9a-f]{64}$/); assert.notEqual(result.access_token,jwt); assert.equal(result.refresh_token,undefined); assert.equal(result.token_type,'Bearer');
    assert.equal(exchange?.p_token,await tokenHash(result.access_token)); assert.equal(exchange?.p_code,await tokenHash(code)); assert.equal(exchange?.p_secret,await tokenHash(secret));
    assert.equal(tokenResponse.headers.get('cache-control'),'no-store');
    assert.ok(calls.some(call=>call.url.pathname==='/auth/v1/user'),'consent verifies browser JWT with Auth');
    assert.ok(calls.some(call=>call.url.pathname.endsWith('/current_session_is_verified')),'consent enforces MFA');
  },call=> {
    if (call.url.pathname==='/auth/v1/user') return {id:userId};
    if (call.url.pathname==='/rest/v1/mastodon_clients') return client;
    if (call.url.pathname.endsWith('/mastodon_issue_code')) { issue=call.body!; return null; }
    if (call.url.pathname.endsWith('/mastodon_exchange_code')) { exchange=call.body!; return {scopes:['read','write'],created_at:1,expires_in:2592000}; }
    if (/\/(current_session_is_active|current_session_is_verified|mastodon_rate_limit)$/.test(call.url.pathname)) return true;
    throw new Error('Unexpected request '+call.url.pathname);
  });
});
Deno.test('native API rejects private posts and unsupported attachments before mutation; expired tokens never become anonymous reads', async()=> {
  let invalid=false;
  await withBackend(async calls=> {
    const headers={authorization:'Bearer '+'c'.repeat(64)};
    for (const body of [{status:'private',visibility:'private'},{status:'picture',media_ids:['123']},{status:'poll',poll:{options:['one','two']}}]) {
      const result=await handleMastodonRequest(jsonRequest('mastodon-api','api/v1/statuses',body,headers));
      assert.equal(result.status,422);
    }
    assert.ok(!calls.some(call=>call.url.pathname.endsWith('/mastodon_write')));
    invalid=true;
    const result=await handleMastodonRequest(new Request('https://fixture.example/functions/v1/mastodon-api/api/v1/timelines/public',{headers}));
    assert.equal(result.status,401);
    assert.ok(!calls.some(call=>call.url.pathname==='/rest/v1/mastodon_statuses'));
  },call=> {
    if (call.url.pathname.endsWith('/mastodon_identity')) return invalid ? new Response(JSON.stringify({code:'PT401',message:'Invalid access token'}),{status:401,headers:{'content-type':'application/json'}}) : {id:'grant',client_id:clientId,user_id:userId,actor_id:actorId,scopes:['read','write']};
    if (call.url.pathname.endsWith('/mastodon_rate_limit')) return true;
    throw new Error('Unexpected request '+call.url.pathname);
  });
});
Deno.test('deployment gate disables endpoints before touching database or accepting credentials', async()=> {
  await withBackend(async calls=> {
    Deno.env.set('MASTODON_CLIENT_ENABLED','false');
    assert.equal((await handleMastodonRequest(jsonRequest('mastodon-api','api/v1/apps',{client_name:'fixture'}))).status,503);
    assert.equal((await handleOAuthRequest(jsonRequest('oauth-authorization-server','token',{}))).status,503);
    assert.equal(calls.length,0);
  },()=>{throw new Error('Unexpected database request');});
});

Deno.test('split-domain OAuth keeps its issuer on the federation domain and accepts consent only on the website origin', async()=> {
  await withBackend(async()=> {
    Deno.env.set('SITE_URL','https://www.nolto.social');
    const result=await handleOAuthRequest(new Request('https://fixture.example/functions/v1/oauth-authorization-server'));
    const metadata=await result.json();
    assert.equal(metadata.issuer,'https://nolto.social');
    assert.equal(metadata.authorization_endpoint,'https://www.nolto.social/oauth/authorize');
    assert.equal(metadata.token_endpoint,'https://nolto.social/oauth/token');
    const input={response_type:'code',client_id:clientId,redirect_uri:'tusky://oauth',scope:'read',state:'preserved',decision:'deny'};
    assert.equal((await handleOAuthRequest(jsonRequest('oauth-authorization-server','consent',input,{origin:'https://nolto.social'}))).status,403);
    const denied=await handleOAuthRequest(jsonRequest('oauth-authorization-server','consent',input,{origin:'https://www.nolto.social'}));
    assert.equal(denied.status,200);
    const callback=new URL((await denied.json()).redirect);
    assert.equal(callback.searchParams.get('error'),'access_denied');
    assert.equal(callback.searchParams.get('state'),'preserved');
  },call=> {
    if (call.url.pathname==='/rest/v1/mastodon_clients') return client;
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

const otherUserId='99999999-2222-4222-8222-222222222222';
const browserJwt=()=>btoa('{}')+'.'+btoa(JSON.stringify({sub:userId,session_id:sessionId,aal:'aal1'}))+'.fixture';
const browserHeaders=()=>({origin:'https://nolto.social',authorization:'Bearer '+browserJwt()});
function pilot(ids=userId) { Deno.env.set('MASTODON_CLIENT_ENABLED','false'); Deno.env.set('MASTODON_CLIENT_PILOT_USER_IDS',ids); }
const apiGet=(path:string,token?:string)=>new Request('https://fixture.example/functions/v1/mastodon-api/api/v1/'+path,{headers:token ? {authorization:'Bearer '+token} : {}});
const tokenInput={client_id:clientId,client_secret:'a'.repeat(64),grant_type:'authorization_code',redirect_uri:'tusky://oauth',code:'b'.repeat(64)};

Deno.test('pilot config fails closed before backend access; only valid nonempty UUID lists expose discovery', async()=> {
  await withBackend(async calls=> {
    for (const configured of ['', ' ', '*', userId+',', userId+',not-a-uuid', JSON.stringify([userId]), Array(101).fill(userId).join(','), userId+'\nextra']) {
      pilot(configured);
      assert.equal((await handleMastodonRequest(apiGet('instance'))).status,503);
      assert.equal((await handleOAuthRequest(jsonRequest('oauth-authorization-server','token',tokenInput))).status,503);
    }
    Deno.env.delete('MASTODON_CLIENT_ENABLED'); Deno.env.delete('MASTODON_CLIENT_PILOT_USER_IDS');
    assert.equal((await handleMastodonRequest(apiGet('instance'))).status,503);
    assert.equal(calls.length,0);
    pilot(' '+userId.toUpperCase()+', '+otherUserId+' ');
    Deno.env.delete('MASTODON_CLIENT_ENABLED');
    const metadata=await handleOAuthRequest(new Request('https://fixture.example/functions/v1/oauth-authorization-server'));
    assert.equal(metadata.status,200);
    const body=await metadata.json();
    assert.deepEqual(body.grant_types_supported,['authorization_code']);
    assert.ok(!JSON.stringify(body).includes(userId));
    assert.equal((await handleMastodonRequest(apiGet('instance'))).status,200);
    Deno.env.set('MASTODON_CLIENT_ENABLED','TRUE');
    assert.equal((await handleMastodonRequest(apiGet('instance'))).status,503);
  },call=> {
    if (call.url.pathname.endsWith('/mastodon_instance_stats')) return {};
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

Deno.test('pilot allows public app registration but blocks anonymous feeds and userless token issuance', async()=> {
  await withBackend(async calls=> {
    pilot();
    const registered=await handleMastodonRequest(jsonRequest('mastodon-api','api/v1/apps',{client_name:'Pilot app',redirect_uris:'tusky://oauth',scopes:'read'}));
    assert.equal(registered.status,200);
    assert.match((await registered.json()).client_secret,/^[0-9a-f]{64}$/);
    for (const path of ['timelines/public','accounts/lookup?acct=alice','custom_emojis']) assert.equal((await handleMastodonRequest(apiGet(path))).status,401);
    const token=await handleOAuthRequest(jsonRequest('oauth-authorization-server','token',{...tokenInput,grant_type:'client_credentials'}));
    assert.equal(token.status,403);
    assert.ok(!calls.some(call=>call.url.pathname==='/rest/v1/mastodon_grants'));
    assert.ok(!calls.some(call=>call.url.pathname==='/rest/v1/mastodon_statuses'));
  },call=> {
    if (call.url.pathname.endsWith('/mastodon_rate_limit')) return true;
    if (call.url.pathname==='/rest/v1/mastodon_clients') return client;
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

Deno.test('pilot consent uses verified user identity and preserves session and MFA checks', async()=> {
  let verifiedUser=otherUserId; let active=true; let mfa=true;
  await withBackend(async calls=> {
    pilot();
    const consent=()=>handleOAuthRequest(jsonRequest('oauth-authorization-server','consent',{response_type:'code',client_id:clientId,redirect_uri:'tusky://oauth',scope:'read',decision:'allow',user_id:userId},browserHeaders()));
    assert.equal((await consent()).status,403,'request user_id and JWT sub cannot override Auth identity');
    assert.ok(!calls.some(call=>call.url.pathname.endsWith('/mastodon_issue_code')));
    verifiedUser=userId; active=false;
    assert.equal((await consent()).status,401);
    active=true; mfa=false;
    assert.equal((await consent()).status,403);
    assert.ok(!calls.some(call=>call.url.pathname.endsWith('/mastodon_issue_code')));
    mfa=true;
    assert.equal((await consent()).status,200);
    const issued=calls.filter(call=>call.url.pathname.endsWith('/mastodon_issue_code'));
    assert.equal(issued.length,1); assert.equal(issued[0].body?.p_user,userId);
    pilot(otherUserId);
    assert.equal((await consent()).status,403);
    assert.equal(calls.filter(call=>call.url.pathname.endsWith('/mastodon_issue_code')).length,1);
  },call=> {
    if (call.url.pathname==='/auth/v1/user') return {id:verifiedUser};
    if (call.url.pathname==='/rest/v1/mastodon_clients') return client;
    if (call.url.pathname.endsWith('/current_session_is_active')) return active;
    if (call.url.pathname.endsWith('/current_session_is_verified')) return mfa;
    if (call.url.pathname.endsWith('/mastodon_rate_limit')) return true;
    if (call.url.pathname.endsWith('/mastodon_issue_code')) return null;
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

Deno.test('pilot code exchange checks stored account membership, including removal after consent', async()=> {
  let codeUser:string | null=userId; let exchangeValid=true;
  await withBackend(async calls=> {
    pilot();
    const exchange=()=>handleOAuthRequest(jsonRequest('oauth-authorization-server','token',{...tokenInput,user_id:userId}));
    assert.equal((await exchange()).status,200);
    const lookup=calls.find(call=>call.url.pathname==='/rest/v1/mastodon_codes')!;
    assert.equal(lookup.url.searchParams.get('code_hash'),'eq.'+await tokenHash(tokenInput.code));
    assert.equal(lookup.url.searchParams.get('client_id'),'eq.'+clientId);
    pilot(otherUserId);
    assert.equal((await exchange()).status,403);
    pilot(); codeUser=otherUserId;
    assert.equal((await exchange()).status,403);
    codeUser=null;
    assert.equal((await exchange()).status,401);
    assert.equal(calls.filter(call=>call.url.pathname.endsWith('/mastodon_exchange_code')).length,1);
    codeUser=userId; exchangeValid=false;
    assert.equal((await exchange()).status,401,'pilot still delegates replay, session and PKCE checks to the atomic RPC');
  },call=> {
    if (call.url.pathname==='/rest/v1/mastodon_clients') return client;
    if (call.url.pathname.endsWith('/mastodon_rate_limit')) return true;
    if (call.url.pathname==='/rest/v1/mastodon_codes') return codeUser ? {user_id:codeUser} : null;
    if (call.url.pathname.endsWith('/mastodon_exchange_code')) return exchangeValid ? {scopes:['read'],created_at:1,expires_in:2592000} : new Response(JSON.stringify({code:'PT401',message:'Invalid authorization code'}),{status:401,headers:{'content-type':'application/json'}});
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

Deno.test('pilot checks every existing grant before reads or writes and blocks removed users and app-only tokens', async()=> {
  let grantUser:string | null=userId; let valid=true;
  await withBackend(async calls=> {
    pilot();
    const read=()=>handleMastodonRequest(apiGet('timelines/home','c'.repeat(64)));
    assert.equal((await read()).status,200);
    assert.equal(calls.filter(call=>call.url.pathname.endsWith('/mastodon_home')).length,1);
    assert.equal(calls.filter(call=>call.url.pathname.endsWith('/mastodon_rate_limit')).length,1,'pilot precheck must not double-charge the API quota');
    for (const removed of [otherUserId,'']) {
      pilot(removed);
      assert.equal((await read()).status,removed ? 403 : 503);
    }
    pilot();
    for (const identity of [otherUserId,null]) {
      grantUser=identity;
      assert.equal((await read()).status,403);
      assert.equal((await handleMastodonRequest(jsonRequest('mastodon-api','api/v1/statuses',{status:'blocked',visibility:'public'},{authorization:'Bearer '+'c'.repeat(64)}))).status,403);
    }
    assert.equal(calls.filter(call=>call.url.pathname.endsWith('/mastodon_home')).length,1);
    assert.ok(!calls.some(call=>call.url.pathname.endsWith('/mastodon_write')));
    grantUser=userId; valid=false;
    assert.equal((await read()).status,401,'revoked/expired pilot grant still fails the identity RPC');
  },call=> {
    if (call.url.pathname.endsWith('/mastodon_identity')) return valid ? {id:'grant',client_id:clientId,user_id:grantUser,actor_id:actorId,scopes:['read','write']} : new Response(JSON.stringify({code:'PT401',message:'Invalid access token'}),{status:401,headers:{'content-type':'application/json'}});
    if (call.url.pathname.endsWith('/mastodon_rate_limit')) return true;
    if (call.url.pathname.endsWith('/mastodon_home')) return [];
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

Deno.test('full enablement ignores pilot restrictions and retains anonymous reads and client credentials', async()=> {
  await withBackend(async()=> {
    Deno.env.set('MASTODON_CLIENT_PILOT_USER_IDS','malformed');
    assert.equal((await handleMastodonRequest(apiGet('custom_emojis'))).status,200);
    assert.equal((await handleMastodonRequest(apiGet('apps/verify_credentials','c'.repeat(64)))).status,200);
    assert.equal((await handleOAuthRequest(jsonRequest('oauth-authorization-server','token',{...tokenInput,grant_type:'client_credentials'}))).status,200);
    const metadata=await (await handleOAuthRequest(new Request('https://fixture.example/functions/v1/oauth-authorization-server'))).json();
    assert.ok(metadata.grant_types_supported.includes('client_credentials'));
  },call=> {
    if (call.url.pathname.endsWith('/mastodon_identity')) return {id:'app-grant',client_id:clientId,user_id:null,actor_id:null,scopes:['read']};
    if (call.url.pathname.endsWith('/mastodon_rate_limit')) return true;
    if (call.url.pathname==='/rest/v1/mastodon_clients') return client;
    if (call.url.pathname==='/rest/v1/mastodon_grants' && call.method==='POST') return {created_at:'2026-09-23T00:00:00Z'};
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

Deno.test('pilot validates all supplied credentials before account/status lookup, including unsupported methods', async()=> {
  await withBackend(async calls=> {
    pilot();
    for (const method of ['GET','POST','HEAD','PATCH']) {
      for (const path of ['accounts/42/follow','statuses/42/favourite']) {
        for (const token of ['dummy','c'.repeat(64)]) {
          const request=new Request(apiGet(path,token),{method});
          assert.equal((await handleMastodonRequest(request)).status,401);
        }
      }
    }
    assert.ok(calls.every(call=>call.url.pathname.endsWith('/mastodon_identity')),'invalid grants cannot trigger data lookups');
  },call=> {
    if (call.url.pathname.endsWith('/mastodon_identity')) return new Response(JSON.stringify({code:'PT401',message:'Invalid access token'}),{status:401,headers:{'content-type':'application/json'}});
    throw new Error('Unexpected request '+call.url.pathname);
  });
});

Deno.test('own-grant management and authenticated token revocation work after pilot removal, off and malformed config', async()=> {
  await withBackend(async calls=> {
    for (const ids of [otherUserId,'','invalid']) {
      pilot(ids);
      const listing=await handleOAuthRequest(new Request('https://fixture.example/functions/v1/oauth-authorization-server/grants',{headers:browserHeaders()}));
      assert.equal(listing.status,200);
      const deletion=new Request(jsonRequest('oauth-authorization-server','grants',{client_id:clientId},browserHeaders()),{method:'DELETE'});
      assert.equal((await handleOAuthRequest(deletion)).status,200);
      assert.equal((await handleOAuthRequest(jsonRequest('oauth-authorization-server','revoke',{...tokenInput,token:'c'.repeat(64)}))).status,200);
    }
    const revocations=calls.filter(call=>call.url.pathname.endsWith('/mastodon_revoke_app'));
    assert.equal(revocations.length,3);
    assert.ok(revocations.every(call=>call.body?.p_user===userId));
    const updates=calls.filter(call=>call.url.pathname==='/rest/v1/mastodon_grants' && call.method==='PATCH');
    assert.equal(updates.length,3);
    assert.ok(updates.every(call=>call.url.searchParams.get('client_id')==='eq.'+clientId));
    assert.equal((await handleOAuthRequest(new Request('https://fixture.example/functions/v1/oauth-authorization-server/grants',{method:'DELETE',headers:{origin:'https://nolto.social'}}))).status,401);
    assert.equal((await handleOAuthRequest(jsonRequest('oauth-authorization-server','revoke',{client_id:clientId,client_secret:'wrong',token:'c'.repeat(64)}))).status,401);
    assert.equal((await handleOAuthRequest(jsonRequest('oauth-authorization-server','token',tokenInput))).status,503);
  },call=> {
    if (call.url.pathname==='/auth/v1/user') return {id:userId};
    if (/\/(current_session_is_active|current_session_is_verified|mastodon_rate_limit)$/.test(call.url.pathname)) return true;
    if (call.url.pathname==='/rest/v1/mastodon_clients') return client;
    if (call.url.pathname==='/rest/v1/mastodon_grants') return call.method==='PATCH' ? null : [];
    if (call.url.pathname.endsWith('/mastodon_revoke_app')) return null;
    throw new Error('Unexpected request '+call.url.pathname);
  });
});
