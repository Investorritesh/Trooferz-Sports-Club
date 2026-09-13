import {X,CheckCircle2,AlertTriangle} from 'lucide-react';
export function Toast({toast,onClose}){if(!toast)return null;return <div className={`toast ${toast.type||'success'}`}><div>{toast.type==='error'?<AlertTriangle size={18}/>:<CheckCircle2 size={18}/>}</div><span>{toast.message}</span><button onClick={onClose}><X size={15}/></button></div>}
export function Spinner({label='Loading...'}){return <div className="spinner-wrap"><div className="spinner"/><span>{label}</span></div>}
export function Modal({open,onClose,title,children,width=560}){if(!open)return null;return <div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal" style={{maxWidth:width}}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={17}/></button></div><div className="modal-body">{children}</div></div></div>}
export function Status({value}){return <span className={`status ${String(value).toLowerCase()}`}>{value}</span>}
export function Stat({label,value,Icon}){return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><div><small>{label}</small><strong>{value}</strong></div></div>}
export const Btn=({children,kind='primary',...p})=><button className={`${kind}-btn`} {...p}>{children}</button>;
