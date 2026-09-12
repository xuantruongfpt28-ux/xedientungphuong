interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any; // Hoặc định nghĩa type chi tiết nếu có
}

export const CustomerDetailModal = ({
  isOpen,
  onClose,
  customer,
}: CustomerDetailModalProps) => {
  if (!isOpen || !customer) return null;

  // Helper format tiền tệ VNĐ
  const formatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '0 VNĐ';
    return Number(amount).toLocaleString('vi-VN') + ' VNĐ';
  };

  // Helper format ngày tháng
  const formatDate = (dateString: any): string => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? String(dateString) : date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-800">
            Thông Tin Chi Tiết Khách Hàng #{customer.id || ''}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            ✕
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {/* Họ và Tên */}
          <div className="col-span-2 flex items-center">
            <span className="w-32 font-semibold text-gray-600">Họ và Tên:</span>
            <span className="font-bold text-blue-600">{customer.fullName || customer.name || '---'}</span>
          </div>

          {/* Số Điện Thoại */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Số Điện Thoại:</span>
            <span>{customer.phone || customer.phoneNumber || '---'}</span>
          </div>

          {/* CCCD / CMND - Đã sửa đúng key idCardNumber từ Supabase */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">CCCD / CMND:</span>
            <span>{customer.idCardNumber || customer.cccd || customer.cmnd || '---'}</span>
          </div>

          {/* Địa Chỉ */}
          <div className="col-span-2 flex items-center">
            <span className="w-32 font-semibold text-gray-600">Địa Chỉ:</span>
            <span>{customer.address || '---'}</span>
          </div>

          {/* Tên Xe / Hãng */}
          <div className="col-span-2 flex items-center">
            <span className="w-32 font-semibold text-gray-600">Tên Xe / Hãng:</span>
            <span className="font-semibold">{customer.carName || customer.bikeName || customer.vehicleName || '---'}</span>
          </div>

          {/* Màu Xe */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Màu Xe:</span>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
              {customer.color || customer.carColor || '---'}
            </span>
          </div>

          {/* Thời Gian Mua */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Thời Gian Mua:</span>
            <span>{formatDate(customer.purchaseDate || customer.buyDate || customer.created_at || customer.createdAt)}</span>
          </div>

          {/* Số Khung (VIN) */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Số Khung (VIN):</span>
            <span className="rounded bg-orange-100 px-2 py-0.5 font-mono text-orange-700">
              {customer.vinNumber || customer.frameNumber || customer.vin || '---'}
            </span>
          </div>

          {/* Số Acquy / Pin */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Số Acquy / Pin:</span>
            <span className="rounded bg-green-100 px-2 py-0.5 font-mono text-green-700">
              {customer.batteryNumber || customer.pinNumber || '---'}
            </span>
          </div>

          {/* Giá Bán */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Giá Bán:</span>
            <span className="font-bold text-red-500">
              {formatCurrency(customer.price || customer.sellingPrice || customer.totalAmount)}
            </span>
          </div>

          {/* Ngân Hàng Góp */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Ngân Hàng Góp:</span>
            <span>{customer.installmentBank || customer.bankName || '---'}</span>
          </div>

          {/* Số Tiền Góp */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Số Tiền Góp:</span>
            <span>
              {formatCurrency(customer.installmentAmount || customer.installmentMoney || customer.monthlyAmount)}
            </span>
          </div>

          {/* Chi Nhánh Mua */}
          <div className="flex items-center">
            <span className="w-32 font-semibold text-gray-600">Chi Nhánh Mua:</span>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-600">
              {customer.branch || customer.branchName || '---'}
            </span>
          </div>

          {/* Ghi Chú */}
          <div className="col-span-2 mt-2 flex items-start">
            <span className="w-32 font-semibold text-gray-600">Ghi Chú:</span>
            <span className="italic text-gray-500">{customer.note || customer.notes || 'Không có ghi chú'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t pt-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;