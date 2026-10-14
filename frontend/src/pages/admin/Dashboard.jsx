import {useEffect,useState} from 'react';
import {Activity,CalendarCheck,BarChart3,IndianRupee,MapPinned,ShieldCheck,Users,TrendingUp} from 'lucide-react';
import {Area,AreaChart,Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import api from '../../services/api';
import {money,dateLabel} from '../../utils/ui';
import {Spinner,Stat} from '../../components/UI';

export default function Dashboard(){
  const [data,setData]=useState();
  const [error,setError]=useState('');
  useEffect(()=>{api.get('/dashboard').then(r=>setData(r.data)).catch(e=>setError(e.response?.data?.message||'Could not load dashboard statistics.'));},[]);
  if(error)return <div className="empty"><b>Dashboard unavailable</b><span>{error}</span></div>;
  if(!data)return <Spinner label="Loading owner dashboard..."/>;
  const s=data.summary;
  return <div>
    <div className="page-head"><div><small>OWNER OVERVIEW</small><h1>Good morning. Club in motion.</h1><p>Database-backed snapshot of members, bookings, facilities and revenue.</p></div><span className="admin-pill"><ShieldCheck size={15}/> Backend protected</span></div>
    <div className="stats-grid">
      <Stat label="Total users" value={s.totalUsers} Icon={Users}/><Stat label="Total bookings" value={s.totalBookings} Icon={CalendarCheck}/><Stat label="Today's bookings" value={s.todayBookings} Icon={Activity}/><Stat label="Upcoming" value={s.upcomingBookings} Icon={TrendingUp}/><Stat label="Active memberships" value={s.activeMemberships} Icon={ShieldCheck}/><Stat label="Facilities online" value={s.availableFacilities} Icon={MapPinned}/><Stat label="Revenue" value={money(s.revenue)} Icon={IndianRupee}/>
    </div>
    <div className="admin-chart-grid">
      <section className="panel chart-panel"><div className="section-head"><div><small>BOOKING TREND</small><h2>Last 7 days</h2></div><BarChart3 size={18}/></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trends}><CartesianGrid strokeDasharray="3 3" opacity={.15}/><XAxis dataKey="label" tickFormatter={v=>v.slice(5)} /><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="count" stroke="#69d7b2" fill="#69d7b2" fillOpacity={.14}/></AreaChart></ResponsiveContainer></div></section>
      <section className="panel chart-panel"><div className="section-head"><div><small>SPORT MIX</small><h2>Bookings by sport</h2></div><Activity size={18}/></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.sportWise.slice(0,7)} layout="vertical" margin={{left:20,right:8}}><CartesianGrid strokeDasharray="3 3" opacity={.15}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={85}/><Tooltip/><Bar dataKey="count" radius={[0,7,7,0]} fill="#77aef3"/></BarChart></ResponsiveContainer></div></section>
    </div>
    <div className="panel"><div className="section-head"><div><small>FACILITY ACTIVITY</small><h2>Top facilities</h2></div></div><div className="mini-grid">{data.facilityWise.map(x=><div className="metric-box" key={x.name}><b>{x.name}</b><strong>{x.count}</strong><span>bookings</span></div>)}</div></div>
  </div>
}
