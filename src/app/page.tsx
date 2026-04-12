import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden p-8 text-center border-t-4 border-[#1e3a5f]">
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">HỆ THỐNG KPI IRUKA</h1>
        <p className="text-gray-500 mb-8 text-sm">Vui lòng chọn loại báo cáo bạn muốn điền</p>
        
        <div className="flex flex-col gap-4">
          <Link 
            href="/weekly" 
            className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 p-4 rounded-xl transition-all border border-blue-100 group"
          >
            <div className="bg-blue-500 text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
              📋
            </div>
            <div className="text-left">
              <h3 className="font-bold text-blue-900">Báo Cáo Tuần</h3>
              <p className="text-xs text-blue-600/70">Tổng kết công việc tuần trước & Kế hoạch tuần tới</p>
            </div>
          </Link>
          
          <Link 
            href="/monthly" 
            className="flex items-center gap-3 bg-purple-50 hover:bg-purple-100 p-4 rounded-xl transition-all border border-purple-100 group"
          >
            <div className="bg-purple-500 text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
              📊
            </div>
            <div className="text-left">
              <h3 className="font-bold text-purple-900">Báo Cáo Tháng</h3>
              <p className="text-xs text-purple-600/70">Tổng kết toàn bộ điểm nhấn trong tháng</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
