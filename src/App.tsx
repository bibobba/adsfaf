import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Typography, SearchInput } from '@maxhub/max-ui';
import { supabase } from './lib/supabase';
import './styles.css';

type Role = 'student' | 'teacher';
type Tab = 'home' | 'search' | 'events' | 'chat' | 'profile' | 'moderation' | 'class';

type User = {
  id: string; name: string; role: Role; className: string; city: string; bio: string;
  tags: string[]; xp: number; coins: number; streak: number; avatar: string;
};

const demoUsers: User[] = [
  {id:'1',name:'Алексей Гаглоев',role:'teacher',className:'Учитель информатики',city:'Краснодар',bio:'Информатика • проекты • игры • хакатоны',tags:['Python','Игры','Робототехника'],xp:4820,coins:1260,streak:18,avatar:'https://i.pravatar.cc/160?img=12'},
  {id:'2',name:'Маша Орлова',role:'student',className:'8Б • гимназия №23',city:'Краснодар',bio:'Делаю игры и собираю школьные команды.',tags:['Roblox','Геймдев','Дизайн'],xp:1740,coins:420,streak:12,avatar:'https://i.pravatar.cc/160?img=47'},
  {id:'3',name:'Илья Ким',role:'student',className:'8Б • гимназия №23',city:'Краснодар',bio:'Dota 2, Python и школьные турниры.',tags:['Dota 2','Python','Турниры'],xp:2310,coins:680,streak:27,avatar:'https://i.pravatar.cc/160?img=11'},
  {id:'4',name:'София Волкова',role:'student',className:'9А • лицей №4',city:'Краснодар',bio:'Фото, волонтёрство и театральная студия.',tags:['Фото','Театр','Волонтёрство'],xp:1980,coins:510,streak:9,avatar:'https://i.pravatar.cc/160?img=44'}
];

const demoEvents = [
  ['e1','Гейм-джем: 48 часов','Межклассовый','27 сентября','Актовый зал + онлайн','🎮',450,120,34],
  ['e2','Осенний субботник 8Б','Класс','28 сентября','Территория школы','🍂',180,60,21],
  ['e3','Школьный Dota 2 Cup','Турнир','4 октября','Компьютерный класс','🏆',600,250,42]
] as const;

const shop = [['🪐','Космический фон',320],['🎮','Пиксельный аватар',180],['⚡','Неоновая рамка',250],['🐉','Драконий бейдж',500]] as const;

export default function App() {
  const [tab,setTab]=useState<Tab>('home');
  const [role,setRole]=useState<Role>('student');
  const [logged,setLogged]=useState(false);
  const [q,setQ]=useState('');
  const [selected,setSelected]=useState<User|null>(null);
  const [joined,setJoined]=useState<string[]>([]);
  const [bought,setBought]=useState<string[]>([]);
  const [users,setUsers]=useState<User[]>(demoUsers);
  const [events,setEvents]=useState(demoEvents);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    if(!supabase) return;
    setLoading(true);
    const [{data:profiles},{data:eventRows}] = await Promise.all([
      supabase.from('profiles').select('id,full_name,role,city,bio,avatar_url,xp,coins,streak,class_id').limit(100),
      supabase.from('events').select('id,title,event_type,starts_at,xp_reward,coin_reward').in('status',['approved','active']).order('starts_at',{ascending:true}).limit(20)
    ]);
    if(profiles?.length){
      setUsers(profiles.map((p:any)=>({
        id:p.id,name:p.full_name,role:p.role==='teacher'?'teacher':'student',
        className:p.class_id?'Участник класса':'Без класса',city:p.city||'',
        bio:p.bio||'Профиль EDU.GAME',tags:[],xp:p.xp||0,coins:p.coins||0,streak:p.streak||0,
        avatar:p.avatar_url||'https://i.pravatar.cc/160?img=12'
      })));
    }
    if(eventRows?.length){
      setEvents(eventRows.map((e:any)=>[
        e.id,e.title,e.event_type,e.starts_at?new Date(e.starts_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long'}):'Дата уточняется',
        'Школьная площадка','✦',e.xp_reward||0,e.coin_reward||0,0
      ]));
    }
    setLoading(false);
  }

  const me=users.find(u=>u.role===role)||demoUsers.find(u=>u.role===role)!;
  const results=useMemo(()=>users.filter(u=>`${u.name} ${u.className} ${u.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase().replace('#',''))),[q,users]);
  const toggleJoin=async(id:string)=>{
    setJoined(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
    if(supabase && !joined.includes(id)) await supabase.from('event_participants').upsert({event_id:id,profile_id:me.id,status:'joined'});
  };
  const login=()=>{setLogged(true);try{(window as any).WebApp?.expand?.()}catch{}};

  if(!logged) return <Login role={role} setRole={setRole} onLogin={login}/>;
  return <div className="app">
    <header><b>✦ EDU<span>.GAME</span></b><div>🔥 {me.streak}　⚡ {me.xp} XP　🪙 {me.coins}</div><Avatar.Container size={38} form="squircle"><Avatar.Image src={me.avatar}/></Avatar.Container></header>
    <main>
      {loading&&<div className="sync">Синхронизация с веб-базой…</div>}
      {tab==='home'&&<Home me={me} events={events} joined={joined} toggle={toggleJoin}/>}
      {tab==='search'&&<Search q={q} setQ={setQ} results={results} open={setSelected}/>}
      {tab==='events'&&<Events events={events} joined={joined} toggle={toggleJoin}/>}
      {tab==='chat'&&<Chat/>}{tab==='moderation'&&role==='teacher'&&<ModerationPanel me={me} onChanged={loadData}/>} {tab==='class'&&<ClassPanel me={me}/>}  {role==='teacher'&&tab==='events'&&<TeacherPanel me={me} onCreated={loadData}/>} 
      {tab==='profile'&&<Profile me={me} bought={bought} buy={n=>setBought(v=>v.includes(n)?v:[...v,n])}/>}
    </main>
    <nav>{([['home','⌂','Главная'],['search','⌕','Люди'],['events','✦','Ивенты'],['chat','◌','Чаты'],['profile','◉','Профиль'],['class','🏫','Класс'],...(role==='teacher'?[['moderation','✓','Заявки']]:[])] as const).map(x=><button className={tab===x[0]?'on':''} onClick={()=>setTab(x[0])} key={x[0]}><span>{x[1]}</span><small>{x[2]}</small></button>)}</nav>
    {selected&&<div className="modal"><div><Profile me={selected} bought={[]} buy={()=>{}} compact/><Button stretched mode="secondary" onClick={()=>setSelected(null)}>Закрыть</Button></div></div>}
  </div>;
}

function Login({role,setRole,onLogin}:{role:Role;setRole:(r:Role)=>void;onLogin:()=>void}){
 return <div className="login"><div className="login-card"><div className="logo">✦</div><Typography.Display>EDU.GAME</Typography.Display><p>Школьная жизнь, где участие превращается в прогресс.</p><div className="roles"><button className={role==='student'?'sel':''} onClick={()=>setRole('student')}>🎒 Ученик</button><button className={role==='teacher'?'sel':''} onClick={()=>setRole('teacher')}>🧑‍🏫 Учитель</button></div><Button stretched size="large" onClick={onLogin}>Войти через Сферум</Button><small>Веб-версия · MAX UI · готово к подключению идентификации</small></div></div>;
}

function Home({me,events,joined,toggle}:{me:User;events:readonly (readonly [string,string,string,string,string,string,number,number,number])[];joined:string[];toggle:(id:string)=>void}){
 return <><section className="hero"><div><label>ТВОЙ ПРОГРЕСС</label><h1>{me.streak} дней<br/><b>в игре.</b></h1><p>Уровень {Math.floor(me.xp/100)} · ещё {100-me.xp%100} XP</p></div><strong>{Math.floor(me.xp/100)}<small>LVL</small></strong></section><div className="grid4"><Card a="🎯" b="Цели" c="3 активные"/><Card a="🏫" b={me.className.split(' ')[0]} c="+1 240 XP"/><Card a="🎒" b="Кружки" c="2 клуба"/><Card a="🏅" b="Достижения" c="7 открыто"/></div><Title t="Ближайшие ивенты"/>{events.slice(0,2).map(e=><Event e={e} joined={joined.includes(e[0])} toggle={toggle} key={e[0]}/>)}<Title t="Люди с похожими интересами"/><div className="people">{demoUsers.filter(u=>u.id!==me.id).map(u=><div key={u.id}><Avatar.Container size={52} form="squircle"><Avatar.Image src={u.avatar}/></Avatar.Container><b>{u.name.split(' ')[0]}</b><small>#{u.tags[0]}</small></div>)}</div></>;
}
function Card(p:{a:string;b:string;c:string}){return <div className="card"><span>{p.a}</span><b>{p.b}</b><small>{p.c}</small></div>}
function Title({t}:{t:string}){return <h2>{t}<button>Все →</button></h2>}
function Event({e,joined,toggle}:{e:readonly (string|number)[];joined:boolean;toggle:(id:string)=>void}){return <article className="event"><div className="cover">{e[5]}</div><div><small>{e[2]} · {e[3]}</small><h3>{e[1]}</h3><p>{e[4]}</p><footer><span>⚡ {e[6]} XP</span><span>🪙 {e[7]}</span><span>👥 {e[8]}</span><Button size="small" mode={joined?'secondary':'primary'} onClick={()=>toggle(String(e[0]))}>{joined?'Участвую':'Участвовать'}</Button></footer></div></article>}
function Search({q,setQ,results,open}:{q:string;setQ:(s:string)=>void;results:User[];open:(u:User)=>void}){return <><Typography.Headline>Поиск людей</Typography.Headline><p className="sub">Имя, фамилия, класс или интерес.</p><SearchInput placeholder="Имя, фамилия, #Python, 8Б…" value={q} onChange={(e:any)=>setQ(e.target.value)}/><div className="chips">{['#Python','#Игры','#Фото','#Dota 2'].map(x=><button onClick={()=>setQ(x.slice(1))} key={x}>{x}</button>)}</div>{results.map(u=><button className="result" key={u.id} onClick={()=>open(u)}><Avatar.Container size={54} form="squircle"><Avatar.Image src={u.avatar}/></Avatar.Container><div><b>{u.name}</b><small>{u.className}</small><span>{u.tags.map(t=>'#'+t).join(' ')||'Профиль EDU.GAME'}</span></div><i>→</i></button>)}</>}
function Events({events,joined,toggle}:{events:readonly (readonly [string,string,string,string,string,string,number,number,number])[];joined:string[];toggle:(id:string)=>void}){return <><Typography.Headline>Ивенты</Typography.Headline><p className="sub">Участие приносит XP, валюту и достижения.</p>{events.map(e=><Event e={e} joined={joined.includes(e[0])} toggle={toggle} key={e[0]}/>)}</>}
function ClassPanel({me}:{me:User}){
 const [name,setName]=useState(''); const [grade,setGrade]=useState('8Б'); const [members,setMembers]=useState<any[]>([]); const [classes,setClasses]=useState<any[]>([]); const [selectedClass,setSelectedClass]=useState<any|null>(null); const [message,setMessage]=useState('');
 useEffect(()=>{load();},[]);
 async function load(){
   if(!supabase)return;
   const {data:cls}=await supabase.from('classes').select('id,name,grade,school_name,moderator_id,total_xp').order('created_at',{ascending:false}).limit(20); setClasses(cls||[]);
   const active=selectedClass||cls?.[0]; if(active){ const {data}=await supabase.from('class_members').select('class_id,membership_role,profiles(id,full_name,role,avatar_url,xp)').eq('class_id',active.id).limit(50); setMembers(data||[]); setSelectedClass(active); }
 }
 async function createClass(){
   if(!supabase||!name.trim()){setMessage('Укажи название класса');return}
   const {data,error}=await supabase.from('classes').insert({name:name.trim(),grade,school_name:'Школа'}).select('id').single();
   if(error||!data){setMessage(error?.message||'Не удалось создать класс');return}
   await supabase.from('class_members').upsert({class_id:data.id,profile_id:me.id,membership_role:'teacher'});
   setMessage('Класс создан. Теперь можно добавлять учеников и назначать старосту.');
   setName(''); await load();
 }
 async function makeModerator(profileId:string,classId:string){
   if(!supabase)return;
   if(!classId)return; await supabase.from('class_members').update({membership_role:'member'}).eq('class_id',classId).eq('membership_role','moderator');
   await supabase.from('class_members').update({membership_role:'moderator'}).eq('class_id',classId).eq('profile_id',profileId);
   await supabase.from('classes').update({moderator_id:profileId}).eq('id',classId);
   setMessage('Староста назначен.'); await load();
 }
 return <section><Typography.Headline>Класс</Typography.Headline><p className="sub">Класс объединяет учеников, старосту, события и общий XP.</p><div className="class-switch">{classes.map(c=><button className={selectedClass?.id===c.id?'active':''} key={c.id} onClick={async()=>{setSelectedClass(c); if(supabase){const {data}=await supabase.from('class_members').select('class_id,membership_role,profiles(id,full_name,role,avatar_url,xp)').eq('class_id',c.id);setMembers(data||[]);}}}>{c.grade||c.name}</button>)}</div>{roleCard(selectedClass||me)}<div className="creator"><h3>Создать класс</h3><input value={name} onChange={e=>setName(e.target.value)} placeholder="Например, 8Б"/><select value={grade} onChange={e=>setGrade(e.target.value)}><option>8Б</option><option>8А</option><option>9А</option><option>9Б</option><option>10А</option><option>11А</option></select><Button stretched onClick={createClass}>Создать класс</Button></div>{message&&<div className="form-message">{message}</div>}<div className="member-list">{members.map((m:any)=><div className="member-row" key={m.profiles.id}><Avatar.Container size={42} form="squircle"><Avatar.Image src={m.profiles.avatar_url||'https://i.pravatar.cc/100?img=12'}/></Avatar.Container><div><b>{m.profiles.full_name}</b><small>{m.membership_role==='moderator'?'⭐ Староста':m.membership_role==='teacher'?'🧑‍🏫 Учитель':'Ученик'} · {m.profiles.xp||0} XP</small></div>{m.membership_role!=='moderator'&&<Button size="small" mode="secondary" onClick={()=>makeModerator(m.profiles.id,selectedClass?.id||'')}>Назначить</Button>}</div>)}</div></section>
}
function roleCard(me:User){return <div className="class-card"><b>{me.className}</b><span>Участники класса · общий XP</span></div>}
function ModerationPanel({me,onChanged}:{me:User;onChanged:()=>void}){
 const [items,setItems]=useState<any[]>([]); const [busy,setBusy]=useState<string|null>(null);
 useEffect(()=>{load();},[]);
 async function load(){ if(!supabase)return; const {data}=await supabase.from('event_proposals').select('id,status,comment,event_id,events!inner(id,title,description,event_type,xp_reward,coin_reward,creator_id)').eq('teacher_id',me.id).eq('status','pending'); setItems(data||[]); }
 async function decide(id:string,eventId:string,status:'approved'|'rejected'){
   if(!supabase)return; setBusy(id);
   await supabase.from('event_proposals').update({status,decided_at:new Date().toISOString()}).eq('id',id);
   await supabase.from('events').update({status}).eq('id',eventId);
   await load(); onChanged(); setBusy(null);
 }
 return <section><Typography.Headline>Заявки</Typography.Headline><p className="sub">Здесь учитель подтверждает ивенты перед публикацией.</p>{items.length===0&&<div className="empty">Новых заявок нет.</div>}{items.map(x=><article className="proposal" key={x.id}><small>{x.events.event_type}</small><h3>{x.events.title}</h3><p>{x.events.description||'Без описания'}</p><div className="proposal-meta">⚡ {x.events.xp_reward} XP · 🪙 {x.events.coin_reward}</div><div className="proposal-actions"><Button size="small" onClick={()=>decide(x.id,x.event_id,'approved')} disabled={busy===x.id}>Подтвердить</Button><Button size="small" mode="secondary" onClick={()=>decide(x.id,x.event_id,'rejected')} disabled={busy===x.id}>Отклонить</Button></div></article>)}</section>
}
function TeacherPanel({me,onCreated}:{me:User;onCreated:()=>void}){
 const [classes,setClasses]=useState<any[]>([]); const [targets,setTargets]=useState<string[]>([]);
 const [title,setTitle]=useState(''); const [description,setDescription]=useState(''); const [type,setType]=useState('class'); const [xp,setXp]=useState(200); const [coins,setCoins]=useState(50); const [message,setMessage]=useState('');
 useEffect(()=>{if(supabase)supabase.from('classes').select('id,name,grade').order('name').then(({data})=>setClasses(data||[]));},[]);
 const create=async()=>{
   if(!supabase||!title.trim()){setMessage('Заполни название');return}
   const {data:event,error}=await supabase.from('events').insert({title:title.trim(),description,event_type:type,status:'pending_teacher',creator_id:me.id,teacher_id:me.id,xp_reward:xp,coin_reward:coins,creator_class_id:targets[0]||null}).select('id').single();
   if(error||!event){setMessage(error?.message||'Не удалось создать');return}
   await supabase.from('event_proposals').insert({event_id:event.id,teacher_id:me.id,status:'pending'});
   if(type==='interclass' && targets.length) await supabase.from('event_classes').insert(targets.map(class_id=>({event_id:event.id,class_id,invitation_status:'pending'})));
   setTitle('');setDescription('');setMessage('Ивент отправлен на подтверждение учителю.');
   onCreated();
 };
 return <section className="creator"><Typography.Headline>Создать ивент</Typography.Headline><p className="sub">Заявка сначала попадает учителю на подтверждение.</p><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Название ивента"/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Описание"/><div className="target-classes"><b>Пригласить классы</b>{classes.map(c=><label key={c.id}><input type="checkbox" checked={targets.includes(c.id)} onChange={()=>setTargets(v=>v.includes(c.id)?v.filter(x=>x!==c.id):[...v,c.id])}/>{c.grade||c.name}</label>)}</div><div className="form-row"><select value={type} onChange={e=>setType(e.target.value)}><option value="class">Класс</option><option value="interclass">Межклассовый</option><option value="tournament">Турнир</option><option value="individual">Индивидуальный</option></select><input type="number" value={xp} onChange={e=>setXp(Number(e.target.value))} placeholder="XP"/></div><input type="number" value={coins} onChange={e=>setCoins(Number(e.target.value))} placeholder="Монеты"/><Button stretched onClick={create}>Отправить на подтверждение</Button>{message&&<div className="form-message">{message}</div>}</section>
}
function Chat(){return <><Typography.Headline>Чаты</Typography.Headline><p className="sub">Класс, кружок, команда и личные сообщения.</p>{[['8Б • общий','Сегодня собираемся на гейм-джем 🔥'],['Гейм-джем 48 часов','Илья: кто берёт фронтенд?'],['IT-клуб','Маша: закинула макет в файлы']].map((x,i)=><div className="chat" key={x[0]}><Avatar.Container size={48} form="squircle"><Avatar.Image src={demoUsers[i+1].avatar}/></Avatar.Container><div><b>{x[0]}</b><small>{x[1]}</small></div><em>{i+1}</em></div>)}</>}
function Profile({me,bought,buy,compact=false}:{me:User;bought:string[];buy:(n:string)=>void;compact?:boolean}){return <><div className="profile-cover">✦　✦　✦</div><div className="profile-head"><Avatar.Container size={82} form="squircle"><Avatar.Image src={me.avatar}/></Avatar.Container><div><Typography.Headline>{me.name}</Typography.Headline><p>{me.className} · {me.city}</p></div></div><p>{me.bio}</p><div className="tags">{me.tags.map(t=><span key={t}>#{t}</span>)}</div><div className="stats"><b>{me.xp}<small>XP</small></b><b>{me.coins}<small>монет</small></b><b>{me.streak}<small>дней streak</small></b></div>{!compact&&<><Title t="Шкаф славы"/><div className="ach"><div>🏆<b>Гейм-джем</b><small>Участник</small></div><div>🔥<b>7 дней</b><small>Серия</small></div><div>🧠<b>Python</b><small>IT-клуб</small></div></div><Title t="Мои кружки"/><div className="clubs"><div>💻 <b>IT-клуб</b><small>34 участника</small></div><div>🎮 <b>Киберспорт</b><small>18 участников</small></div></div><Title t="Магазин профиля"/><div className="shop">{shop.map(x=><button key={x[1]} onClick={()=>buy(x[1])}><span>{x[0]}</span><b>{x[1]}</b><small>{bought.includes(x[1])?'Куплено':x[2]+' 🪙'}</small></button>)}</div></>}</>;}
