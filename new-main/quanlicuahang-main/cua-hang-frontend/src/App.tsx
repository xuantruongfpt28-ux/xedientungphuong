import { useState, useEffect } from 'react';

// Định nghĩa và export kiểu dữ liệu cho Khách hàng
export interface Customer {
  id: string;
  fullName?: string;
  ho_ten?: string;
  phone?: string;
  dien_thoai?: string;
  address?: string;
  dia_chi?: string;
  vehicle?: string;
  xe?: string;
  color?: string;
  mau?: string;
  frameNumber?: string;
  so_khung?: string;
  batteryNumber?: string;
  so_pin?: string;
  price?: number | string;
  gia_xe?: number | string;
  createdAt?: string;
}

// Định nghĩa và export kiểu dữ liệu SystemAccount khớp với bảng Account Supabase
export interface SystemAccount {
  id?: string | number;
  username?: string;
  fullName?: string;
  ho_ten?: string;
  branch?: string;
  chi_nhanh?: string;
  role?: string;
  email?: string;
  phone?: string;
}

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Dữ liệu mẫu kiểm tra
  useEffect(() => {
    setCustomers([
      {
        id: '1',
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        address: 'Ấp Nội Ô, Xã Giồng Riềng, Tỉnh An Giang',
        vehicle: 'Yadea X-Deluxe',
        color: 'Đỏ Đen',
        frameNumber: 'RLY123456789XYZ',
        batteryNumber: 'BAT987654',
        price: 18500000,
        createdAt: '2026-09-08'
      }
    ]);
  }, []);

  // Hàm phụ trợ tách ngày tháng năm hiện tại
  const parseDateDetails = (customer: Customer) => {
    const dateObj = customer.createdAt ? new Date(customer.createdAt) : new Date();
    return {
      day: String(dateObj.getDate()).padStart(2, '0'),
      month: String(dateObj.getMonth() + 1).padStart(2, '0'),
      year: dateObj.getFullYear()
    };
  };

  // Hàm lấy thông tin xe
  const extractVehicleInfo = (customer: Customer) => {
    return customer.vehicle || customer.xe || 'Xe điện chính hãng';
  };

  // Hàm thực thi in hợp đồng theo chuẩn mới
  const executePrintContract = (customer: Customer) => {
    const { day, month, year } = parseDateDetails(customer);

    const hoTen = customer.fullName || customer.ho_ten || '';
    const dienThoai = customer.phone || customer.dien_thoai || '';
    const diaChi = customer.address || customer.dia_chi || '';
    const modelXe = extractVehicleInfo(customer);
    const mauXe = customer.color || customer.mau || '';
    const soVin = customer.frameNumber || customer.so_khung || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup trên trình duyệt để in hợp đồng!');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Hop_dong_ban_xe_${hoTen || 'khach_hang'}</title>
        <style>
          @page { size: A4 portrait; margin: 5mm 6mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { margin: 0; padding: 0; background: #fff; font-family: "Times New Roman", Times, serif; font-size: 10px; line-height: 1.3; color: #000; }
          .page { width: 100%; }
          table { width: 100%; border-collapse: collapse; }
          table.main-grid { border: 1px solid #000; margin: 4px 0; table-layout: fixed; }
          table.main-grid td, table.main-grid th { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
          .bold { font-weight: bold; }
          .italic { font-style: italic; }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- HEADER -->
          <table>
            <tbody>
              <tr>
                <td style="width: 50%; vertical-align: top; text-align: left;">
                  <strong style="font-size: 11px;">CÔNG TY TNHH TPMOTOR TÙNG PHƯỢNG EV</strong><br />
                  <span style="font-size: 9.5px;">CN Xe Điện Tổng Hợp: 102 Ấp Nội Ô, Xã Giồng Riềng, Tỉnh An Giang (0866.979.841)</span>[cite: 3]<br />
                  <span style="font-size: 9.5px;">CN2 Xe Điện Yadea và Vinfast: 41 Hùng Vương, Ấp 6, Xã Giồng Riềng, Tỉnh An Giang (0976.820.941)</span>[cite: 3]
                </td>
                <td style="width: 50%; vertical-align: top; text-align: center;">
                  <strong style="font-size: 11px;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
                  <strong style="font-size: 10.5px;">Độc lập - Tự do - Hạnh phúc</strong><br />
                  <i style="font-size: 9.5px;">An Giang, Ngày ${day} Tháng ${month} Năm ${year}</i>[cite: 3]
                </td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: center; margin: 4px 0 6px 0;">
            <div class="bold" style="font-size: 13px;">BIÊN NHẬN</div>
            <div class="bold" style="font-size: 10.5px;">(KIÊM HỢP ĐỒNG BÁN XE)</div>[cite: 3]
          </div>

          <!-- THÔNG TIN BÊN BÁN & MUA -->
          <div style="margin-bottom: 3px;">
            <div class="bold">Bên A (Bên bán xe): CÔNG TY TNHH TPMOTOR TÙNG PHƯỢNG EV</div>[cite: 3]
            <div>- Địa Chỉ: Xe Điện Tổng Hợp: 102 Ấp Nội Ô, Xã Giồng Riềng, Tỉnh An Giang (0888.67.98.41) | Xe Điện Yadea và Vinfast: 41 Hùng Vương, Ấp 6, Xã Giồng Riềng, Tỉnh An Giang (0976.820.941)</div>[cite: 3]
          </div>

          <div style="margin-bottom: 4px;">
            <div class="bold">II. Bên B (Bên mua xe):</div>[cite: 3]
            <div>- Họ và tên: <strong style="font-size: 11px;">${hoTen || '...................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Điện thoại: <strong>${dienThoai || '.........................'}</strong></div>
            <div>- Địa chỉ: <strong>${diaChi || '.......................................................................................................................................'}</strong></div>
            <div>- CCCD số: .................................................... Ngày cấp: .................... Nơi cấp: Cục Cảnh Sát.</div>[cite: 3]
            <div>- Thông Tin Xe: <strong>${modelXe}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Số VIN: <strong style="font-family: monospace;">${soVin}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Màu xe: <strong>${mauXe}</strong></div>[cite: 3]
            <div>- Ngân Hàng Vay: .................................... Số tiền vay: .................................... Số tiền khách đặt cọc: ....................................</div>[cite: 3]
            <div>- Thu Xe cũ: .................................... Số VIN (xe cũ): ....................................</div>[cite: 3]
          </div>

          <div style="margin-bottom: 4px; font-size: 9.5px;">
            Sau khi bàn bạc và đi đến thống nhất, bên A đồng ý bán xe và bên B đồng ý mua xe với các điều khoản sau:
          </div>[cite: 3]

          <!-- BẢNG ĐIỀU KHOẢN -->
          <table class="main-grid">
            <thead>
              <tr>
                <th style="width: 34%; text-align: center; font-weight: bold;">I. ĐIỀU KHOẢN VỀ BẢO HÀNH</th>[cite: 3]
                <th style="width: 34%; text-align: center; font-weight: bold;">II. HƯỚNG DẪN SỬ DỤNG ẮC QUY</th>[cite: 3]
                <th style="width: 32%; text-align: center; font-weight: bold;">III. THỎA THUẬN & ĐIỀU KHOẢN CHUNG</th>[cite: 3]
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="bold" style="color: #b71c1c;">1. YADEA:</div>[cite: 3]
                  <div style="margin-bottom: 3px;">- Động cơ, IC, bộ sạc bảo hành 24 tháng. Bình bảo hành 24 tháng (Cụ thể lỗi 1 bình đổi cả bộ trong 18 tháng, lỗi bình nào đổi bình đó trong 6 tháng còn lại hoặc 20.000km).<br>- Hoặc gói cao cấp: Động cơ, IC, bộ sạc bảo hành 36 tháng. Pin bảo hành 36 tháng (hoặc 30.000km).<br>- Hoặc: Động cơ, IC, bộ sạc bảo hành 24 tháng. Bình bảo hành 12 tháng (lỗi 1 bình đổi cả bộ trong 9 tháng, lỗi bình nào đổi bình đó trong 3 tháng còn lại).</div>[cite: 3]
                  
                  <div class="bold" style="color: #b71c1c; margin-top: 4px;">2. XE HÃNG KHÁC (JP Motor, Detech, Victoria,...):</div>[cite: 3]
                  <div>- Bình bảo hành 12 tháng, phù 06 - 09 tháng (nên xem hướng dẫn sử dụng ắc quy).<br>- Động cơ, IC, bộ sạc bảo hành 12 tháng.</div>[cite: 3]
                </td>
                <td>
                  <div class="italic">
                    <strong>- Lần sạc đầu tiên:</strong> Sau khi sạc ắc quy đầy, sạc báo đèn xanh, rút sạc ra đợi khoảng 20 phút, cắm lại cho sạc tiếp tục khoảng 1 tiếng.
                  </div>[cite: 3]
                  <div class="italic" style="margin-top: 3px;">
                    <strong>- Trong quá trình sử dụng:</strong><br />
                    + Bạn nên để xe khoảng 30 phút để ắc quy nguội bớt rồi hãy sạc.<br />
                    + Nên sạc đầy rồi mới sử dụng. Hạn chế tối đa tình trạng xe cạn ắc quy và sạc nhiều lần trong ngày.<br />
                    + Trường hợp có việc bận không có nhu cầu sử dụng xe, thì mỗi tuần nên sạc 1 lần.
                  </div>[cite: 3]
                  <div class="bold" style="font-size: 9px; margin-top: 4px; text-align: center; border-top: 1px solid #000; padding-top: 2px; color: #b71c1c;">
                    ẮC QUY SẼ XUỐNG CẤP DẦN THEO THỜI GIAN NÊN HÃY SỬ DỤNG ĐÚNG CÁCH!
                  </div>[cite: 3]
                </td>
                <td>
                  <div class="bold">* Thỏa thuận chung:</div>[cite: 3]
                  <div>- Giá bán xe chưa bao gồm phí trước bạ, phí bấm biển số và phí dịch vụ (đối với xe máy điện).<br>- Dịch vụ bấm biển số (không bao bảo hiểm và phí kẹp biển số): ........................<br>- Quà tặng: <strong>NÓN BẢO HIỂM</strong><br>- Phụ kiện theo xe: Bộ sạc.</div>[cite: 3]
                  
                  <div class="bold" style="margin-top: 4px;">* Điều khoản chung:</div>[cite: 3]
                  <div>1. Bên B đã kiểm tra xe mới 100%, không trầy xước, phụ tùng theo xe đầy đủ.<br>2. Bên B đã được bên A hướng dẫn sử dụng xe, chế độ bảo hành và kỹ năng lái xe an toàn, nhận quà khuyến mãi đầy đủ, bên B đã đọc và xác nhận những nội dung trên.<br>3. Biên nhận được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 1 bản.</div>[cite: 3]
                </td>
              </tr>
              <tr>
                <td colspan="3">
                  <div class="bold" style="text-decoration: underline;">LƯU Ý QUAN TRỌNG KHI SỬ DỤNG & BẢO HÀNH:</div>[cite: 3]
                  <table style="font-size: 9.5px; line-height: 1.25; margin-top: 2px;">
                    <tbody>
                      <tr><td style="width: 10px; vertical-align: top;">✓</td><td class="bold">Luôn đội nón bảo hiểm khi tham gia giao thông (Kể cả xe đạp điện).</td></tr>[cite: 3]
                      <tr><td style="vertical-align: top;">✓</td><td class="bold">Những phần hao mòn trong quá trình sử dụng không bảo hành. Không bảo hành đối với xe đã thay đổi kết cấu về điện.</td></tr>[cite: 3]
                      <tr><td style="vertical-align: top;">✓</td><td class="bold">Bảo hành phải cho tháo xe, đồng thời xe phải được đem đến cửa hàng. (NẾU BẢO HÀNH TẬN NƠI TÍNH PHÍ TỪ 100.000Đ ĐẾN 200.000Đ/LẦN).</td></tr>[cite: 3]
                      <tr><td style="vertical-align: top;">✓</td><td class="bold">Điều kiện miễn phí cứu hộ trong tháng thứ 1 (lỗi kỹ thuật nhà sản xuất): Từ 1-10km: 100k; 10-15km: 150k; Trên 20km (Phạm vi Huyện Giồng Riềng cũ): 200k.</td></tr>[cite: 3]
                      <tr><td style="vertical-align: top;">✓</td><td class="bold" style="color: #b71c1c;">ĐẶC BIỆT LƯU Ý: ẮC-QUI PHẢI ĐƯỢC SẠC THƯỜNG XUYÊN. TRÁNH TRƯỜNG HỢP MẤT NGUỒN HOẶC TUỘT ÁP, ĐẠI LÝ TỪ CHỐI BẢO HÀNH.</td></tr>[cite: 3]
                      <tr><td style="vertical-align: top;">✓</td><td class="bold">Bên B (Người Mua) đã được tư vấn xe phù hợp với độ tuổi, các xe có thể đăng ký biển số đã được khách hàng xác nhận.</td></tr>[cite: 3]
                      <tr><td style="vertical-align: top;">✓</td><td class="bold" style="color: #b71c1c;">KHÁCH HÀNG ĐỔI XE: Trong 12 giờ bù lỗi 10% | Trong 3 ngày bù lỗi 20% | Trong 30 ngày bù lỗi 30% (Trong bất kì trường hợp nào, đối với xe xuất hóa đơn, đã đóng thuế trước bạ bù lỗi 30%).</td></tr>[cite: 3]
                    </tbody>
                  </table>
                  <div style="text-align: right; font-style: italic; margin-top: 2px; font-size: 9.5px;">
                    Tôi (bên B) hoàn toàn đồng ý với những thoả thuận trên.
                  </div>[cite: 3]
                </td>
              </tr>
            </tbody>
          </table>

          <!-- CHỮ KÝ -->
          <table style="margin-top: 8px; text-align: center;">
            <tbody>
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <strong style="font-size: 11px;">Bên bán A</strong><br />
                  <i style="font-size: 9.5px;">(Ký tên và đóng dấu)</i>[cite: 3]
                  <div style="height: 45px;"></div>
                </td>
                <td style="width: 50%; vertical-align: top;">
                  <strong style="font-size: 11px;">Bên mua B</strong><br />
                  <i style="font-size: 9.5px;">(Ký tên và ghi rõ họ tên)</i>[cite: 3]
                  <div style="height: 45px;"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredCustomers = customers.filter(c => 
    (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ color: '#1d4ed8', borderBottom: '2px solid #1d4ed8', paddingBottom: '10px' }}>
        Hệ thống Quản lý Bán hàng & In Hợp đồng - Tùng Phượng EV[cite: 3]
      </h2>

      <div style={{ margin: '15px 0', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Tìm kiếm theo tên hoặc số điện thoại khách hàng..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px 12px', width: '350px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Họ tên</th>
            <th style={{ padding: '10px' }}>Điện thoại</th>
            <th style={{ padding: '10px' }}>Địa chỉ</th>
            <th style={{ padding: '10px' }}>Dòng xe</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => (
              <tr key={customer.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{customer.fullName}</td>
                <td style={{ padding: '10px' }}>{customer.phone}</td>
                <td style={{ padding: '10px' }}>{customer.address}</td>
                <td style={{ padding: '10px' }}>{customer.vehicle}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <button 
                    onClick={() => executePrintContract(customer)}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    🖨️ In Hợp Đồng Chuẩn
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                Không tìm thấy khách hàng nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}