// import React from 'react';
// import { TrendingUp, Users, Package, DollarSign, ArrowUpRight, ArrowDownRight, LayoutDashboard } from 'lucide-react';

// const Dashboard = () => {
//   return (
//     <div className="p-8 space-y-8 bg-slate-50 min-h-full">
//       {/* Header Section */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Business Insights</h1>
//           <p className="text-slate-500 font-medium">Welcome back, Admin. Here is what's happening today.</p>
//         </div>
//         <div className="flex gap-3">
//           <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
//             Export Report
//           </button>
//           <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-200 transition-all">
//             Generate AI Summary
//           </button>
//         </div>
//       </div>

//       {/* Quick Stats Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <StatCard title="Daily Revenue" value="12,450 ETB" change="+12.5%" icon={<DollarSign />} up />
//         <StatCard title="Total Orders" value="142" change="+8.2%" icon={<TrendingUp />} up />
//         <StatCard title="Active Staff" value="6 / 8" change="Stable" icon={<Users />} />
//         <StatCard title="Low Stock Items" value="12" change="-2" icon={<Package />} down />
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         {/* Main Chart Area Placeholder */}
//         <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-[400px] flex flex-col">
//           <div className="flex justify-between items-center mb-8">
//             <h3 className="font-black text-xl text-slate-800">Sales Velocity</h3>
//             <select className="bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-500 text-sm p-2 outline-none">
//               <option>Last 7 Days</option>
//               <option>Last 30 Days</option>
//             </select>
//           </div>
//           <div className="flex-1 w-full bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
//             <LayoutDashboard size={40} className="opacity-20" />
//             <p className="font-bold italic">Sales Chart Loading...</p>
//           </div>
//         </div>

//         {/* Best Sellers Card */}
//         <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
//             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full"></div>
//             <h3 className="font-black text-xl mb-6 relative z-10">Best Sellers</h3>
//             <div className="space-y-6 relative z-10">
//                 <TopItem name="Special Ful" sales="45" price="120 ETB" />
//                 <TopItem name="Habesha Beer" sales="38" price="85 ETB" />
//                 <TopItem name="Sprit (500ml)" sales="22" price="45 ETB" />
//                 <TopItem name="Macchiato" sales="19" price="35 ETB" />
//             </div>
//             <button className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all text-indigo-300">
//                 View Full Inventory
//             </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// /* --- Internal Helper Components --- */

// const StatCard = ({ title, value, change, icon, up, down }) => (
//   <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
//     <div className="flex justify-between items-start mb-4">
//       <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">{icon}</div>
//       <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
//         up ? 'bg-green-100 text-green-600' : 
//         down ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
//       }`}>
//         {up && <ArrowUpRight size={14} />}
//         {down && <ArrowDownRight size={14} />}
//         {change}
//       </span>
//     </div>
//     <h4 className="text-slate-500 font-bold text-sm mb-1">{title}</h4>
//     <p className="text-2xl font-black text-slate-900">{value}</p>
//   </div>
// );

// const TopItem = ({ name, sales, price }) => (
//     <div className="flex items-center justify-between group cursor-default">
//         <div>
//             <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">{name}</p>
//             <p className="text-xs text-slate-400 font-medium">{sales} sales</p>
//         </div>
//         <p className="font-black text-indigo-400">{price}</p>
//     </div>
// );

// export default Dashboard;