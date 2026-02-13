
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  ChevronLeft, 
  ChevronRight, 
  X,
  CreditCard,
  History,
  TrendingUp,
  Settings,
  Share2,
  Check,
  Calendar,
  Filter,
  FileText,
  DollarSign,
  PieChart,
  LayoutGrid,
  Users,
  Save
} from 'lucide-react';
import { AppState, Expenditure, MONTHS, MemberContribution } from './types';
import { saveState, loadState } from './services/db';

declare var html2canvas: any;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    mainTitle: "SPSIB ASSOCIATION",
    subTitle: "OFFICIAL DIGITAL AUDIT STATEMENT",
    logo: "",
    members: [],
    expenditures: [],
    lastBackup: new Date().toISOString()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'expenditure' | 'players' | 'settings'>('matrix');
  const [showImageModal, setShowImageModal] = useState<string[] | null>(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [sharePreview, setSharePreview] = useState<{ type: 'expense' | 'table' | 'full_report' | 'expense_list', data: any } | null>(null);

  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS);
  const [expenseMonthFilter, setExpenseMonthFilter] = useState<string>('All');

  const [memberForm, setMemberForm] = useState({ name: '', editingIndex: -1 });
  const [paymentForm, setPaymentForm] = useState({ memberIndex: -1, month: MONTHS[new Date().getMonth()], amount: 600 });
  const [expenseForm, setExpenseForm] = useState({ 
    id: '', 
    date: new Date().toISOString().split('T')[0], 
    description: '', 
    amount: 0, 
    images: [] as string[],
    isEditing: false 
  });

  const [configForm, setConfigForm] = useState({
    mainTitle: "",
    subTitle: "",
    logo: ""
  });

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await loadState();
        if (saved) {
          setState(saved);
          setConfigForm({
            mainTitle: saved.mainTitle,
            subTitle: saved.subTitle,
            logo: saved.logo || ""
          });
        }
      } catch (err) {
        console.error("DB Load Error", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading) saveState(state);
  }, [state, isLoading]);

  const filteredExpenses = useMemo(() => {
    const sorted = [...state.expenditures].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (expenseMonthFilter === 'All') return sorted;
    return sorted.filter(ex => {
      const exDate = new Date(ex.date);
      const exMonth = MONTHS[exDate.getMonth()];
      return exMonth === expenseMonthFilter;
    });
  }, [state.expenditures, expenseMonthFilter]);

  const totals = useMemo(() => {
    let income = 0;
    state.members.forEach(m => {
      (Object.values(m.contributions) as MemberContribution[]).forEach(c => income += (Number(c.amount) || 0));
    });
    let expense = 0;
    state.expenditures.forEach(e => expense += (Number(e.amount) || 0));
    return { income, expense, balance: income - expense };
  }, [state.members, state.expenditures]);

  const monthlyTotals = useMemo(() => {
    const map: Record<string, { income: number, expense: number }> = {};
    MONTHS.forEach(m => {
      let income = 0;
      state.members.forEach(member => income += (member.contributions[m]?.amount || 0));
      let expense = 0;
      state.expenditures.forEach(ex => {
        const d = new Date(ex.date);
        if (MONTHS[d.getMonth()] === m) expense += (Number(ex.amount) || 0);
      });
      map[m] = { income, expense };
    });
    return map;
  }, [state.members, state.expenditures]);

  const recordPayment = () => {
    if (paymentForm.memberIndex === -1 || !paymentForm.amount) return;
    const updatedMembers = [...state.members];
    const member = updatedMembers[paymentForm.memberIndex];
    member.contributions[paymentForm.month] = { amount: paymentForm.amount };
    setState(prev => ({ ...prev, members: updatedMembers }));
  };

  const submitExpense = () => {
    if (!expenseForm.amount || !expenseForm.description) return;
    if (expenseForm.isEditing) {
      setState(prev => ({
        ...prev,
        expenditures: prev.expenditures.map(ex => ex.id === expenseForm.id ? { ...ex, ...expenseForm, isEditing: false } : ex)
      }));
    } else {
      setState(prev => ({
        ...prev,
        expenditures: [{ ...expenseForm, id: crypto.randomUUID() }, ...prev.expenditures]
      }));
    }
    setExpenseForm({ id: '', date: new Date().toISOString().split('T')[0], description: '', amount: 0, images: [], isEditing: false });
  };

  const triggerShare = async () => {
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#020617',
        scale: 3, 
        useCORS: true,
        width: captureRef.current.scrollWidth,
        height: captureRef.current.scrollHeight
      });
      canvas.toBlob((blob: any) => {
        if (!blob) return;
        const file = new File([blob], 'SPSIB_Statement.jpg', { type: 'image/jpeg' });
        if (navigator.share) {
          navigator.share({ files: [file], title: state.mainTitle }).catch(() => {});
        } else {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob as any);
          link.download = 'SPSIB_Report.jpg';
          link.click();
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error("Share error", err);
    }
  };

  const handleSaveConfig = () => {
    setState(prev => ({
      ...prev,
      mainTitle: configForm.mainTitle,
      subTitle: configForm.subTitle,
      logo: configForm.logo
    }));
    alert("Profile Updated!");
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-32 bg-slate-950 text-slate-100">
      <header className="px-6 text-center py-8 space-y-2">
        <div className="flex justify-center mb-4">
          <div className="relative w-20 h-20 bg-rose-600 rounded-3xl flex items-center justify-center shadow-2xl border-2 border-white/20 overflow-hidden">
            {state.logo ? <img src={state.logo} className="w-full h-full object-cover" /> : <span className="text-white font-black text-4xl">S</span>}
          </div>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none truncate whitespace-nowrap">{state.mainTitle}</h1>
        <p className="text-[10px] font-bold text-rose-500 tracking-[0.4em] uppercase truncate whitespace-nowrap">{state.subTitle}</p>
      </header>

      <div className="px-4 flex gap-2 mb-8">
        <MiniCard label="COLLECT" value={totals.income} text="text-emerald-400" icon={<TrendingUp size={16}/>}/>
        <MiniCard label="EXPENSE" value={totals.expense} text="text-rose-400" icon={<History size={16}/>}/>
        <MiniCard label="BALANCE" value={totals.balance} text="text-sky-400" icon={<DollarSign size={16}/>}/>
      </div>

      <main className="px-4 space-y-8">
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-5 border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-5 bg-emerald-600 p-4 rounded-2xl border border-emerald-400 shadow-lg">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 truncate whitespace-nowrap">
                   <LayoutGrid size={18}/> LEDGER MATRIX
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setSharePreview({ type: 'table', data: { months: selectedMonths } })} className="p-2.5 bg-black/30 rounded-xl border border-white/20 active:scale-90"><Share2 size={18} className="text-white"/></button>
                  <button onClick={() => setSharePreview({ type: 'full_report', data: totals })} className="p-2.5 bg-black/30 rounded-xl border border-white/20 active:scale-90"><FileText size={18} className="text-white"/></button>
                </div>
              </div>

              <div className="mb-5 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">MONTH FILTERS</p>
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedMonths(MONTHS)} className="text-[10px] font-black text-emerald-500 uppercase active:scale-90">SELECT ALL</button>
                    <button onClick={() => setSelectedMonths([])} className="text-[10px] font-black text-rose-500 uppercase active:scale-90">CLEAR</button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS.map(m => (
                    <button 
                      key={m} 
                      onClick={() => setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b)=>MONTHS.indexOf(a)-MONTHS.indexOf(b)))}
                      className={`py-3 rounded-xl text-[11px] font-black transition-all ${selectedMonths.includes(m) ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar rounded-xl border border-white/5">
                <table className="bordered-table text-[13px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="text-left text-rose-500 font-black uppercase py-4 px-4 whitespace-nowrap">MEMBER NAME</th>
                      {selectedMonths.map(m => <th key={m} className="text-center text-sky-400 font-black uppercase py-4">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {state.members.map((member) => (
                      <tr key={member.name} className="bg-slate-900/40">
                        <td className="font-bold text-slate-100 uppercase py-4 px-4 whitespace-nowrap">{member.name}</td>
                        {selectedMonths.map(m => (
                          <td key={m} className="text-center font-black text-emerald-400 py-4">
                            {member.contributions[m]?.amount ? `₹${member.contributions[m].amount}` : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-emerald-500/10 font-black">
                      <td className="text-emerald-400 uppercase py-4 px-4">TOTAL INCOME</td>
                      {selectedMonths.map(m => <td key={m} className="text-center text-emerald-400 font-bold py-4">₹{monthlyTotals[m].income}</td>)}
                    </tr>
                    <tr className="bg-rose-500/10 font-black">
                      <td className="text-rose-500 uppercase py-4 px-4">TOTAL EXPENSE</td>
                      {selectedMonths.map(m => <td key={m} className="text-center text-rose-500 font-bold py-4">₹{monthlyTotals[m].expense}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <Card title="NEW PAYMENT ENTRY">
              <div className="grid grid-cols-1 gap-3">
                <select value={paymentForm.memberIndex} onChange={e => setPaymentForm(p => ({...p, memberIndex: parseInt(e.target.value)}))} className="bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black text-white text-base outline-none active:border-rose-500 focus:border-rose-500 transition-all appearance-none">
                  <option value="-1">CHOOSE PLAYER</option>
                  {state.members.map((m, i) => <option key={m.name} value={i}>{m.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <select value={paymentForm.month} onChange={e => setPaymentForm(p => ({...p, month: e.target.value}))} className="flex-1 bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black text-base text-white outline-none">
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="number" placeholder="₹" value={paymentForm.amount || ''} onChange={e => setPaymentForm(p => ({...p, amount: parseInt(e.target.value)}))} className="w-32 bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black text-xl text-emerald-400 outline-none" />
                  <button onClick={recordPayment} className="px-8 bg-emerald-600 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all"><Plus size={24}/></button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'expenditure' && (
          <div className="space-y-6">
            <Card title={expenseForm.isEditing ? "EDIT BILL RECORD" : "CREATE NEW BILL"}>
              <div className="space-y-4">
                <input type="text" placeholder="BILL DESCRIPTION (E.G. TURF RENT)" value={expenseForm.description} onChange={e => setExpenseForm(p => ({...p, description: e.target.value.toUpperCase()}))} className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black outline-none text-white text-base uppercase" />
                <div className="flex gap-3">
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({...p, date: e.target.value}))} className="flex-1 bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black text-base outline-none text-white" />
                  <input type="number" placeholder="₹ AMT" value={expenseForm.amount || ''} onChange={e => setExpenseForm(p => ({...p, amount: parseInt(e.target.value)}))} className="w-32 bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black text-xl text-rose-500 outline-none" />
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border-2 border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">VOUCHERS ({expenseForm.images.length})</p>
                  <div className="flex flex-wrap gap-3">
                    {expenseForm.images.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setExpenseForm(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}))} className="absolute inset-0 bg-rose-600/80 flex items-center justify-center opacity-0 hover:opacity-100 text-white"><X size={20}/></button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-900 active:bg-slate-800"><Plus size={24}/><input type="file" multiple accept="image/*" className="hidden" onChange={e => {
                      const files = e.target.files; if (!files) return;
                      Array.from(files).forEach(file => {
                        const reader = new FileReader(); reader.onload = ev => setExpenseForm(p => ({...p, images: [...p.images, ev.target?.result as string]}));
                        reader.readAsDataURL(file);
                      });
                    }}/></label>
                  </div>
                </div>
                <button onClick={submitExpense} className="w-full py-5 bg-rose-600 font-black text-white rounded-2xl shadow-2xl uppercase tracking-[0.2em] text-sm active:scale-95 transition-all">{expenseForm.isEditing ? "UPDATE BILL ENTRY" : "SAVE AUDIT ENTRY"}</button>
              </div>
            </Card>

            <div className="bg-slate-900 rounded-[2rem] p-5 border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-5 bg-rose-600 p-4 rounded-2xl border border-rose-400 shadow-lg">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 truncate whitespace-nowrap"><History size={18} /> AUDIT LOG</h2>
                <div className="flex gap-3">
                  <select value={expenseMonthFilter} onChange={e => setExpenseMonthFilter(e.target.value)} className="bg-black/30 text-[10px] font-black uppercase border border-white/20 rounded-xl px-3 py-2 text-white outline-none">
                    <option value="All">ALL MONTHS</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button onClick={() => setSharePreview({ type: 'expense_list', data: filteredExpenses })} className="p-2.5 bg-black/30 rounded-xl border border-white/20 active:scale-90"><Share2 size={18} className="text-white"/></button>
                </div>
              </div>
              
              <div className="overflow-x-auto no-scrollbar rounded-xl">
                <table className="bordered-table text-[13px]">
                  <thead className="bg-slate-800">
                    <tr className="text-slate-200 uppercase font-black">
                      <th className="text-left py-4 px-4">DATE</th>
                      <th className="text-left py-4 px-4">DETAILS</th>
                      <th className="text-center py-4 px-2 w-20">VCHR</th>
                      <th className="text-right py-4 px-4">AMT</th>
                      <th className="text-center py-4 px-2 w-10">EDT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map(ex => (
                      <tr key={ex.id} className="bg-slate-900/40">
                        <td className="text-slate-400 font-bold whitespace-nowrap py-4 px-4">{ex.date.split('-').reverse().slice(0,2).join('/')}</td>
                        <td className="font-black text-slate-100 uppercase py-4 px-4 leading-tight">{ex.description}</td>
                        <td className="py-4 px-2">
                           <div className="flex -space-x-2 justify-center">
                              {ex.images.slice(0, 2).map((img, idx) => (
                                <button key={idx} onClick={() => (setShowImageModal(ex.images), setCurrentImageIdx(idx))} className="w-8 h-8 rounded border border-white/20 overflow-hidden shadow-lg active:scale-90 relative">
                                  <img src={img} className="w-full h-full object-cover" />
                                </button>
                              ))}
                              {ex.images.length === 0 && <span className="text-slate-700 text-[10px] font-black uppercase">-</span>}
                           </div>
                        </td>
                        <td className="text-right font-black text-rose-500 whitespace-nowrap py-4 px-4">₹{ex.amount}</td>
                        <td className="text-center py-4 px-2">
                           <button onClick={(() => setExpenseForm({...ex, isEditing: true}))} className="text-emerald-400 active:scale-90"><Edit3 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-6">
            <Card title="MANAGE ROSTER">
              <div className="space-y-4 mb-6">
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="bordered-table text-[14px]">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="text-left uppercase py-4 px-5">PLAYER NAME</th>
                        <th className="text-center uppercase py-4 w-24">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.members.map((m, i) => (
                        <tr key={m.name} className="bg-slate-900/40">
                          <td className="font-black text-slate-100 uppercase px-5 py-5">{m.name}</td>
                          <td className="px-5 py-5 text-center">
                            <div className="flex justify-center gap-6">
                              <button onClick={() => {
                                const newName = prompt("Edit Player Name:", m.name);
                                if (newName) setState(p => ({...p, members: p.members.map((mem, idx) => idx === i ? {...mem, name: newName.toUpperCase()} : mem).sort((a,b)=>a.name.localeCompare(b.name))}));
                              }} className="text-sky-400 active:scale-90"><Edit3 size={20}/></button>
                              <button onClick={() => { if(confirm(`REMOVE PLAYER: ${m.name}?`)) setState(p => ({...p, members: p.members.filter((_, idx) => idx !== i)})) }} className="text-rose-500 active:scale-90"><Trash2 size={20}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-slate-950 rounded-2xl border-2 border-slate-800">
                <input placeholder="ENTER NEW NAME" value={memberForm.name} onChange={e => setMemberForm({name: e.target.value.toUpperCase(), editingIndex: -1})} className="flex-1 bg-transparent px-4 font-black outline-none text-base text-white uppercase" />
                <button onClick={() => { if(memberForm.name) { setState(p => ({...p, members: [...p.members, {name: memberForm.name, contributions: {}}].sort((a,b)=>a.name.localeCompare(b.name))})); setMemberForm({name:'', editingIndex:-1}); } }} className="px-6 py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">ADD</button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 pb-20">
            <Card title="PROFILE & BRANDING">
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">MAIN TITLE</label>
                  <input value={configForm.mainTitle} onChange={e => setConfigForm(p => ({...p, mainTitle: e.target.value.toUpperCase()}))} className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black text-white text-base uppercase outline-none focus:border-rose-500 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">SUB TITLE / SLOGAN</label>
                  <input value={configForm.subTitle} onChange={e => setConfigForm(p => ({...p, subTitle: e.target.value.toUpperCase()}))} className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-5 font-black text-white text-base uppercase outline-none focus:border-rose-500 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">SYSTEM LOGO</label>
                  <div className="flex gap-5 items-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/10 flex items-center justify-center shadow-inner">
                      {configForm.logo ? <img src={configForm.logo} className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-slate-600" />}
                    </div>
                    <label className="flex-1 p-5 bg-slate-900 border-2 border-slate-800 rounded-2xl text-[12px] font-black uppercase text-center cursor-pointer hover:bg-slate-800 transition-all shadow-md active:scale-95">
                      UPLOAD IMAGE
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader(); reader.onload = ev => setConfigForm(p => ({...p, logo: ev.target?.result as string}));
                        reader.readAsDataURL(file);
                      }}/>
                    </label>
                  </div>
                </div>
                <button onClick={handleSaveConfig} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl uppercase text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl"><Save size={20}/> SAVE PROFILE</button>
              </div>
            </Card>

            <Card title="DATABASE BACKUP">
              <div className="grid grid-cols-2 gap-4">
                {/* Fixed: Use the global Blob constructor directly to ensure correct TypeScript inference. */}
                <button onClick={() => {
                  const blob = new Blob([JSON.stringify(state)], {type: 'application/json'});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `SPSIB_BACKUP.json`; a.click();
                  URL.revokeObjectURL(url);
                }} className="flex flex-col items-center gap-3 p-8 bg-slate-900 border-2 border-slate-800 rounded-2xl font-black text-[11px] text-sky-400 uppercase shadow-lg active:scale-95">
                  <Download size={32}/> EXPORT
                </button>
                <label className="flex flex-col items-center gap-3 p-8 bg-slate-900 border-2 border-slate-800 rounded-2xl font-black text-[11px] text-emerald-400 uppercase cursor-pointer shadow-lg active:scale-95">
                  <Upload size={32}/> IMPORT
                  <input type="file" className="hidden" accept=".json" onChange={e => {
                    const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
                    const reader = new FileReader(); reader.onload = ev => { 
                      try { setState(JSON.parse(ev.target?.result as string)); alert("Database Restored!"); } catch(err) { alert("Invalid File!"); } 
                    };
                    reader.readAsText(file);
                  }}/>
                </label>
              </div>
            </Card>
          </div>
        )}
      </main>

      <div className="footer-fixed">
        <nav className="flex items-center justify-between px-3 h-20 max-w-xl mx-auto gap-2">
          <NavButton active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')} icon={<LayoutGrid size={24} />} label="LEDGER" color="rose" />
          <NavButton active={activeTab === 'expenditure'} onClick={() => setActiveTab('expenditure')} icon={<CreditCard size={24} />} label="BILLING" color="emerald" />
          <NavButton active={activeTab === 'players'} onClick={() => setActiveTab('players')} icon={<Users size={24} />} label="PLAYERS" color="indigo" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24} />} label="SETUP" color="slate" />
        </nav>
      </div>

      {sharePreview && (
        <div className="fixed inset-0 z-[120] bg-black/98 flex flex-col items-center pt-2 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-lg mb-40 px-2">
            <div ref={captureRef} className="bg-slate-950 p-8 space-y-6 relative overflow-hidden rounded-2xl w-full border-2 border-white/20 shadow-2xl">
              <div className="flex flex-col items-center text-center gap-2 pb-6 border-b-2 border-white/10">
                <div className="w-20 h-20 bg-rose-600 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-2xl border-2 border-white/30 overflow-hidden">
                   {state.logo ? <img src={state.logo} className="w-full h-full object-cover" /> : "S"}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase leading-none truncate whitespace-nowrap">{state.mainTitle}</h2>
                  <p className="text-[12px] font-black text-rose-500 uppercase tracking-[0.4em] mt-2 opacity-90 truncate whitespace-nowrap">{state.subTitle}</p>
                </div>
              </div>

              {sharePreview.type === 'full_report' ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <SummaryLineBig label="COLLECTIONS" value={totals.income} color="text-emerald-400" />
                    <SummaryLineBig label="EXPENDITURES" value={totals.expense} color="text-rose-400" />
                  </div>
                  <div className="p-8 bg-sky-600 rounded-[2rem] border-4 border-sky-300 text-center shadow-2xl">
                    <span className="text-[14px] font-black text-sky-100 uppercase tracking-[0.3em] block mb-2 truncate whitespace-nowrap">NET AUDIT BALANCE</span>
                    <span className="text-6xl font-black text-white tracking-tighter">₹{totals.balance.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                      {MONTHS.map(m => (
                        <div key={m} className="text-center p-3 bg-slate-900 rounded-2xl border-2 border-white/5">
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-1 truncate whitespace-nowrap">{m}</p>
                          <p className="text-[13px] font-black text-emerald-400">₹{monthlyTotals[m].income}</p>
                          <p className="text-[11px] font-black text-rose-500 mt-1">₹{monthlyTotals[m].expense}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : sharePreview.type === 'table' ? (
                <div className="space-y-4">
                  <div className="bg-emerald-600 p-4 rounded-2xl border-2 border-emerald-400 text-center shadow-xl">
                    <h3 className="text-[18px] font-black text-white uppercase tracking-wider truncate whitespace-nowrap">PAYMENT AUDIT MATRIX</h3>
                    <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-1 truncate whitespace-nowrap">{selectedMonths.length} VERIFIED MONTHLY COLUMNS</p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl">
                    <table className="bordered-table text-[14px]">
                      <thead>
                        <tr className="bg-rose-600 text-white">
                          <th className="text-left font-black uppercase py-4 px-6 border-white/20">PLAYER NAME</th>
                          {selectedMonths.map(m => <th key={m} className="text-center font-black uppercase py-4 border-white/20">{m}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {state.members.map(member => (
                          <tr key={member.name} className="bg-slate-900/80">
                            <td className="font-black text-slate-100 uppercase py-4 px-6 whitespace-nowrap border-white/20">{member.name}</td>
                            {selectedMonths.map(m => (
                              <td key={m} className="text-center font-black text-emerald-400 py-4 border-white/20">
                                {member.contributions[m]?.amount ? `₹${member.contributions[m].amount}` : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : sharePreview.type === 'expense_list' ? (
                <div className="space-y-4">
                   <div className="bg-rose-600 p-4 rounded-2xl border-2 border-rose-400 text-center shadow-xl">
                      <h3 className="text-[18px] font-black text-white uppercase tracking-wider truncate whitespace-nowrap">BILLING AUDIT SUMMARY</h3>
                      <p className="text-[10px] font-bold text-rose-100 uppercase tracking-widest mt-1 truncate whitespace-nowrap">VERIFIED DIGITAL VOUCHERS</p>
                   </div>
                    <div className="overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl">
                      <table className="bordered-table text-[14px]">
                        <thead>
                          <tr className="bg-slate-900 text-sky-400">
                            <th className="text-left font-black uppercase py-4 px-4 border-white/20">DATE</th>
                            <th className="text-left font-black uppercase py-4 px-4 border-white/20">DETAILS</th>
                            <th className="text-center font-black uppercase py-4 px-2 border-white/20 w-16">VCHR</th>
                            <th className="text-right font-black uppercase py-4 px-4 border-white/20">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sharePreview.data.map((ex: any) => (
                            <tr key={ex.id} className="bg-slate-900/80">
                              <td className="font-bold text-slate-400 py-4 px-4 border-white/20 whitespace-nowrap">{ex.date.split('-').reverse().slice(0,2).join('/')}</td>
                              <td className="font-black text-slate-100 uppercase py-4 px-4 border-white/20 leading-tight">{ex.description}</td>
                              <td className="py-4 px-2 border-white/20">
                                <div className="flex -space-x-1.5 justify-center">
                                  {ex.images.slice(0, 2).map((img: string, idx: number) => (
                                    <div key={idx} className="w-7 h-7 rounded border border-white/30 overflow-hidden shadow relative">
                                      <img src={img} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                  {ex.images.length === 0 && <span className="text-slate-800 text-[10px] font-black uppercase">-</span>}
                                </div>
                              </td>
                              <td className="text-right font-black text-rose-500 py-4 px-4 border-white/20 whitespace-nowrap">₹{ex.amount}</td>
                            </tr>
                          ))}
                          <tr className="bg-rose-600/30 font-black">
                            <td colSpan={3} className="p-4 text-rose-500 uppercase text-[13px] border-white/20 truncate whitespace-nowrap">TOTAL PERIOD EXPENDITURES</td>
                            <td className="p-4 text-right text-rose-500 text-xl font-black whitespace-nowrap border-white/20">₹{sharePreview.data.reduce((acc: number, curr: any) => acc + curr.amount, 0).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                </div>
              ) : null}

              <div className="pt-6 flex items-center justify-between border-t-2 border-white/10 opacity-60">
                <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2 truncate whitespace-nowrap"><Check size={12}/> SECURED DIGITAL AUDIT</p>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] truncate whitespace-nowrap">SPSIB LEDGER v4.0</p>
              </div>
            </div>
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 p-6 flex gap-4 w-full bg-slate-950/90 backdrop-blur-xl border-t-2 border-white/20 z-[130] pb-safe shadow-2xl">
            <button onClick={() => setSharePreview(null)} className="flex-1 py-5 bg-slate-800 text-white rounded-2xl font-black text-sm uppercase active:scale-95 shadow-xl transition-all">CLOSE</button>
            <button onClick={triggerShare} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-3 active:scale-95 shadow-2xl transition-all"><Share2 size={24}/> SHARE REPORT</button>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="fixed inset-0 z-[200] bg-black/98 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <button onClick={() => setShowImageModal(null)} className="absolute top-10 right-10 text-white p-3 bg-slate-800 rounded-full shadow-2xl z-50"><X size={32} /></button>
          <div className="w-full max-w-5xl h-[75vh] relative flex items-center justify-center">
            <img src={showImageModal[currentImageIdx]} className="max-w-full max-h-full object-contain rounded-3xl border-2 border-white/20 shadow-2xl" />
            <button onClick={() => setCurrentImageIdx(p => (p-1+showImageModal.length)%showImageModal.length)} className="absolute left-0 p-6 text-white bg-slate-800/80 rounded-full active:scale-90 shadow-2xl"><ChevronLeft size={48}/></button>
            <button onClick={() => setCurrentImageIdx(p => (p+1)%showImageModal.length)} className="absolute right-0 p-6 text-white bg-slate-800/80 rounded-full active:scale-90 shadow-2xl"><ChevronRight size={48}/></button>
          </div>
          <div className="mt-12 px-8 py-3 bg-slate-900 rounded-full border-2 border-white/10 shadow-2xl">
             <span className="text-white font-black uppercase text-xs tracking-[0.3em]">VOUCHER {currentImageIdx+1} / {showImageModal.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-950">
    <div className="relative flex flex-col items-center">
      <div className="w-20 h-20 border-[6px] border-slate-900 border-t-rose-500 rounded-full animate-spin shadow-2xl"></div>
      <p className="text-slate-500 font-black tracking-[0.5em] mt-8 text-center uppercase text-[10px] animate-pulse">SPSIB SECURED LEDGER</p>
    </div>
  </div>
);

const MiniCard = ({ label, value, icon, text }: any) => (
  <div className="bg-slate-900 rounded-3xl p-5 flex-1 flex flex-col items-center justify-center text-center border border-white/10 active:scale-95 transition-all shadow-xl">
    <div className={`p-3 rounded-2xl bg-black/40 ${text} mb-3 shadow-inner`}>{icon}</div>
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 truncate w-full px-1">{label}</span>
    <div className="text-[16px] font-black text-white truncate w-full">₹{value.toLocaleString()}</div>
  </div>
);

const Card = ({ title, children }: any) => (
  <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden shadow-2xl">
    <div className="absolute top-0 left-0 w-2 h-full bg-rose-600"></div>
    <h3 className="text-[12px] font-black text-slate-400 mb-8 uppercase tracking-[0.4em] flex items-center gap-3 truncate whitespace-nowrap">
      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]"></div>
      {title}
    </h3>
    {children}
  </div>
);

const NavButton = ({ active, onClick, icon, label, color }: any) => {
  const activeStyles: any = {
    rose: 'bg-rose-600 text-white shadow-2xl border-2 border-rose-400',
    emerald: 'bg-emerald-600 text-white shadow-2xl border-2 border-emerald-400',
    indigo: 'bg-indigo-600 text-white shadow-2xl border-2 border-indigo-400',
    slate: 'bg-slate-700 text-white shadow-2xl border-2 border-slate-500',
  };
  
  return (
    <button onClick={onClick} className={`flex items-center gap-3 py-3 px-4 rounded-2xl transition-all duration-300 ${active ? activeStyles[color] + ' scale-110' : 'text-slate-500 opacity-60'}`}>
      <div className="transition-transform duration-300">{icon}</div>
      <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${active ? 'block' : 'hidden'}`}>{label}</span>
    </button>
  );
};

const SummaryLineBig = ({ label, value, color }: any) => (
  <div className="p-4 bg-slate-900 rounded-3xl border-2 border-white/10 flex flex-col items-center text-center shadow-inner">
    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 truncate whitespace-nowrap w-full">{label}</p>
    <p className={`text-3xl font-black ${color} leading-none tracking-tight`}>₹{value.toLocaleString()}</p>
  </div>
);

export default App;
