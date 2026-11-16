import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';

async function fetchAssignmentDetail(assignId: string) {
    const token = localStorage.getItem('onegate_token') || localStorage.getItem('accessToken'); 
    
    const response = await fetch(`${API_BASE_URL}/adapter/lms/assign/${encodeURIComponent(assignId)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch assignment: ${response.status}`);
    }

    return await response.json(); 
}

export default function LmsAssignView() {
    const { assignId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadAssign() {
            try {
                const res = await fetchAssignmentDetail(assignId as string);
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        loadAssign();
    }, [assignId]);

    if (isLoading) return <div className="p-8 text-center text-slate-500"><RefreshCw className="animate-spin inline mr-2"/> Memuat detail tugas...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Gagal memuat tugas.</div>;

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-sm text-slate-500 hover:text-[#0a2540] transition-colors">
                <ArrowLeft size={16} className="mr-1" /> Kembali ke Mata Kuliah
            </button>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-3 bg-red-50 rounded-lg text-red-500">
                        <FileText size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-[#0a2540]">{data.title}</h2>
                </div>
                
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 md:gap-8 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        <span><strong>Opened:</strong> {data.opened}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-500" />
                        <span><strong>Due:</strong> {data.due}</span>
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="text-lg font-semibold text-[#0a2540] mb-4">Submission status</h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <tbody className="divide-y divide-slate-200">
                                {data.statusTable.map((row: any, idx: number) => {
                                    const isSubmittedRow = row.value.toLowerCase().includes('submitted for grading');
                                    return (
                                        <tr key={idx} className={isSubmittedRow ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'}>
                                            <th className="px-6 py-4 font-semibold text-slate-700 bg-slate-50 w-1/3 border-r border-slate-200">{row.label}</th>
                                            <td className={`px-6 py-4 ${isSubmittedRow ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>{row.value}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-6 flex gap-3">
                        <button className="px-4 py-2 bg-[#0a2540] text-white rounded-lg text-sm font-medium hover:bg-[#173d6b] transition-colors">Edit submission</button>
                        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-200">Remove submission</button>
                    </div>
                </div>
            </div>
        </div>
    );
}