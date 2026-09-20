import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Typography, SearchInput } from '@maxhub/max-ui';
import { supabase } from './lib/supabase';
import './styles.css';

type Role = 'student' | 'teacher';
type Tab = 'home' | 'search' | 'events' | 'chat' | 'profile';

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
      {tab==='chat'&&<Chat/>}{role==='teacher'&&tab==='events'&&<TeacherPanel me={me} onCreated={loadData}/>}
      {tab==='profile'&&<Profile me={me} bought={bought} buy={n=>setBought(v=>v.includes(n)?v:[...v,n])}/>}
    </main>
    <nav>{([['home','⌂','Главная'],['search','⌕','Люди'],['events','✦','Ивенты'],['chat','◌','Чаты'],['profile','◉','Профиль']] as const).map(x=><button className={tab===x[0]?'on':''} onClick={()=>setTab(x[0])} key={x[0]}><span>{x[1]}</span><small>{x[2]}</small></button>)}</nav>
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
function TeacherPanel({me,onCreated}:{me:User;onCreated:()=>void}){
 const [title,setTitle]=useState(''); const [description,setDescription]=useState(''); const [type,setType]=useState('class'); const [xp,setXp]=useState(200); const [coins,setCoins]=useState(50); const [message,setMessage]=useState('');
 const create=async()=>{
   if(!supabase||!title.trim()){setMessage('Заполни название');return}
   const {data:event,error}=await supabase.from('events').insert({title:title.trim(),description,event_type:type,status:'pending_teacher',creator_id:me.id,teacher_id:me.id,xp_reward:xp,coin_reward:coins}).select('id').single();
   if(error||!event){setMessage(error?.message||'Не удалось создать');return}
   await supabase.from('event_proposals').insert({event_id:event.id,teacher_id:me.id,status:'pending'});
   setTitle('');setDescription('');setMessage('Ивент отправлен на подтверждение учителю.');
   onCreated();
 };
 return <section className="creator"><Typography.Headline>Создать ивент</Typography.Headline><p className="sub">Заявка сначала попадает учителю на подтверждение.</p><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Название ивента"/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Описание"/><div className="form-row"><select value={type} onChange={e=>setType(e.target.value)}><option value="class">Класс</option><option value="interclass">Межклассовый</option><option value="tournament">Турнир</option><option value="individual">Индивидуальный</option></select><input type="number" value={xp} onChange={e=>setXp(Number(e.target.value))} placeholder="XP"/></div><input type="number" value={coins} onChange={e=>setCoins(Number(e.target.value))} placeholder="Монеты"/><Button stretched onClick={create}>Отправить на подтверждение</Button>{message&&<div className="form-message">{message}</div>}</section>
}
function Chat(){return <><Typography.Headline>Чаты</Typography.Headline><p className="sub">Класс, кружок, команда и личные сообщения.</p>{[['8Б • общий','Сегодня собираемся на гейм-джем 🔥'],['Гейм-джем 48 часов','Илья: кто берёт фронтенд?'],['IT-клуб','Маша: закинула макет в файлы']].map((x,i)=><div className="chat" key={x[0]}><Avatar.Container size={48} form="squircle"><Avatar.Image src={demoUsers[i+1].avatar}/></Avatar.Container><div><b>{x[0]}</b><small>{x[1]}</small></div><em>{i+1}</em></div>)}</>}
function Profile({me,bought,buy,compact=false}:{me:User;bought:string[];buy:(n:string)=>void;compact?:boolean}){return <><div className="profile-cover">✦　✦　✦</div><div className="profile-head"><Avatar.Container size={82} form="squircle"><Avatar.Image src={me.avatar}/></Avatar.Container><div><Typography.Headline>{me.name}</Typography.Headline><p>{me.className} · {me.city}</p></div></div><p>{me.bio}</p><div className="tags">{me.tags.map(t=><span key={t}>#{t}</span>)}</div><div className="stats"><b>{me.xp}<small>XP</small></b><b>{me.coins}<small>монет</small></b><b>{me.streak}<small>дней streak</small></b></div>{!compact&&<><Title t="Шкаф славы"/><div className="ach"><div>🏆<b>Гейм-джем</b><small>Участник</small></div><div>🔥<b>7 дней</b><small>Серия</small></div><div>🧠<b>Python</b><small>IT-клуб</small></div></div><Title t="Мои кружки"/><div className="clubs"><div>💻 <b>IT-клуб</b><small>34 участника</small></div><div>🎮 <b>Киберспорт</b><small>18 участников</small></div></div><Title t="Магазин профиля"/><div className="shop">{shop.map(x=><button key={x[1]} onClick={()=>buy(x[1])}><span>{x[0]}</span><b>{x[1]}</b><small>{bought.includes(x[1])?'Куплено':x[2]+' 🪙'}</small></button>)}</div></>}</>;}
