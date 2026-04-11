import React from 'react';

type Props = {
  name: string;
  role: string;
  dept: string;
  date: string;
}

export default function HeaderInfo({ name, role, dept, date }: Props) {
  return (
    <div className="mb-6 max-w-md mt-4">
      <h1 className="text-2xl font-bold uppercase mb-4 text-black">BÁO CÁO & KẾ HOẠCH TUẦN</h1>
      <table className="w-full border-collapse border border-gray-600 text-sm">
        <tbody>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 w-32 text-black">Họ tên</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold">{name}</td>
          </tr>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 text-black">Báo cáo cho</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold">{role}</td>
          </tr>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 text-black">Phòng</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold">{dept}</td>
          </tr>
          <tr>
            <td className="border border-gray-600 px-3 py-2 font-bold bg-gray-200 text-black">Ngày đánh giá</td>
            <td className="border border-gray-600 px-3 py-2 text-blue-800 font-bold">{date}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
