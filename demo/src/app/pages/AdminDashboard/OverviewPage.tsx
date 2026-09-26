import React from 'react';
import { motion } from 'motion/react';
import { Users, MessageSquare, BookOpen, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { enrollmentData } from './data';

export const OverviewPage: React.FC = () => {
  const stats = [
    { label: 'Active Students', value: '1,284', trend: '+12%', up: true, icon: <Users className="text-blue-600" /> },
    { label: 'Pending Inquiries', value: '42', trend: '+5', up: true, icon: <MessageSquare className="text-orange-600" /> },
    { label: 'Average Grade', value: '91.4%', trend: '-0.2%', up: false, icon: <BookOpen className="text-[#185C20]" /> },
    { label: 'Upcoming Events', value: '6', trend: 'Next: 3 days', up: true, icon: <Calendar className="text-purple-600" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-50 rounded-2xl">{stat.icon}</div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${stat.up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Weekly Enrollment Activity</h3>
              <p className="text-xs text-gray-400 font-medium">Monitoring new applications for the upcoming school year</p>
            </div>
            <select className="bg-gray-50 border-none rounded-lg text-xs font-bold px-3 py-2 outline-none">
              <option>Last 7 Days</option>
              <option>Last Month</option>
            </select>
          </div>
          <div className="p-6 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrollmentData}>
                <defs>
                  <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#185C20" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#185C20" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="students" stroke="#185C20" strokeWidth={3} fillOpacity={1} fill="url(#colorEnroll)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-bold text-lg">Inquiry Distribution</h3>
            <p className="text-xs text-gray-400 font-medium">Categorized by educational level</p>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <div className="space-y-4">
              {[
                { label: 'Kindergarten', value: 45, color: 'bg-[#185C20]' },
                { label: 'Elementary', value: 30, color: 'bg-[#EDCD1F]' },
                { label: 'Junior High', value: 25, color: 'bg-blue-600' },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="text-gray-900">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={`h-full ${item.color}`}
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-50 grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                <p className="text-xl font-black text-gray-900">42</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">New</p>
                <p className="text-xl font-black text-red-500">12</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
