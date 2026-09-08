import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Table,
  Input,
  Button,
  Card,
  Tag,
  Typography,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Space,
  DatePicker,
  Select,
  Radio,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FilterOutlined,
  PrinterOutlined,
  ShopOutlined,
  LockOutlined,
  UserOutlined,
  LogoutOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  OrderedListOutlined,
  BarChartOutlined,
  InboxOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { supabase } from './supabase';
import { SalesAnalytics } from './components/SalesAnalytics';
import { InventoryManagement } from './components/InventoryManagement';
import { ActivityLogView } from './components/ActivityLogView';
import { logActivity } from './utils/logger';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Tự động lấy domain hiện tại nếu không khai báo VITE_API_URL
const BASE_API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export interface Customer {
  id?: number;
  fullName?: string;
  ho_ten?: string;
  phone?: string;
  dien_thoai?: string;
  address?: string;
  dia_chi?: string;
  brand?: string;
  model?: string;
  vehicleName?: string;
  color?: string;
  mau?: string;
  price?: number | string;
  gia_xe?: number | string;
  staffName?: string;
  nhan_vien?: string;
  branchName?: string;
  chi_nhanh?: string;
  frameNumber?: string;
  so_khung?: string;
  batteryNumber?: string;
  so_pin?: string;
  imageUrl?: string;
  formTimestamp?: string;
  timestamp?: string;
  ngay_mua?: string;
  created_at?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface SystemAccount {
  username: string;
  password: string;
  fullName: string;
  branch: string;
  role: 'admin' | 'staff';
}

const DEFAULT_FIXED_ACCOUNTS: SystemAccount[] = [
  { username: 'admin', password: '123456', fullName: 'Ban Quản Trị (Admin)', branch: 'Chi nhánh 1', role: 'admin' },
  { username: 'chinhanh1', password: '123456', fullName: 'Chi nhánh 1', branch: 'Chi nhánh 1', role: 'staff' },
  { username: 'chinhanh2', password: '123456', fullName: 'Chi nhánh 2', branch: 'Chi nhánh 2', role: 'staff' },
];

export const extractVehicleInfo = (item: Customer) => {
  if (item.vehicleName && item.vehicleName.trim() && item.vehicleName.trim() !== '---') {
    return item.vehicleName.trim();
  }

  const excludedKeys = [
    'id', 'fullname', 'ho_ten', 'phone', 'dien_thoai', 'address', 'dia_chi',
    'color', 'mau', 'price', 'gia_xe', 'staffname', 'nhan_vien', 'branchname',
    'chi_nhanh', 'framenumber', 'so_khung', 'batterynumber', 'so_pin', 'imageurl',
    'formtimestamp', 'timestamp', 'ngay_mua', 'created_at', 'createdat', 'dấu thời gian'
  ];

  const foundText: string[] = [];

  Object.keys(item).forEach((key) => {
    const lowerKey = key.toLowerCase().trim();
    if (excludedKeys.some((ex) => lowerKey.includes(ex))) return;

    const val = item[key];
    if (typeof val === 'string') {
      const clean = val.trim();
      if (
        clean &&
        clean !== '---' &&
        clean !== 'SUCCESS' &&
        !clean.startsWith('http') &&
        isNaN(Number(clean)) &&
        !foundText.includes(clean)
      ) {
        foundText.push(clean);
      }
    }
  });

  return foundText.length > 0 ? foundText.join(' ') : '---';
};

export const parseDateDetails = (customerData: any) => {
  if (!customerData) {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
      fullDate: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      dayjsObj: dayjs(),
    };
  }

  const rawDateStr =
    (typeof customerData === 'string' ? customerData : null) ||
    customerData.formTimestamp ||
    customerData.timestamp ||
    customerData.ngay_mua ||
    customerData.created_at ||
    customerData.createdAt ||
    '';

  if (rawDateStr.includes('/')) {
    const cleanDate = rawDateStr.split(' ')[0].trim();
    const parts = cleanDate.split('/');
    if (parts.length >= 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}`, dayjsObj: dayjs(`${y}-${m}-${d}`) };
    }
  }

  if (rawDateStr.includes('-')) {
    const cleanDate = rawDateStr.split('T')[0].split(' ')[0].trim();
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return {
          day: parts[2].padStart(2, '0'),
          month: parts[1].padStart(2, '0'),
          year: parts[0],
          fullDate: `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`,
          dayjsObj: dayjs(`${parts[0]}-${parts[1]}-${parts[2]}`),
        };
      }
      return {
        day: parts[0].padStart(2, '0'),
        month: parts[1].padStart(2, '0'),
        year: parts[2],
        fullDate: `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`,
        dayjsObj: dayjs(`${parts[2]}-${parts[1]}-${parts[0]}`),
      };
    }
  }

  const dateObj = new Date(rawDateStr);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = String(dateObj.getFullYear());
    return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}`, dayjsObj: dayjs(dateObj) };
  }

  return { day: '....', month: '....', year: '2026', fullDate: '---', dayjsObj: null };
};

const executePrintContract = (customer: Customer, selectedBranch: string = 'Chi nhánh 1') => {
  const { day, month, year } = parseDateDetails(customer);

  const hoTen = customer.fullName || customer.ho_ten || '';
  const dienThoai = customer.phone || customer.dien_thoai || '';
  const diaChi = customer.address || customer.dia_chi || '';
  const modelXe = extractVehicleInfo(customer);
  const mauXe = customer.color || customer.mau || '';
  const soKhung = customer.frameNumber || customer.so_khung || '';
  const soPin = customer.batteryNumber || customer.so_pin || '';

  const formatMoney = (val?: any) => {
    if (!val) return '';
    const num = Number(String(val).replace(/[^0-9]/g, ''));
    return isNaN(num) || num === 0 ? String(val) : num.toLocaleString('vi-VN') + ' VNĐ';
  };

  const giaXe = formatMoney(customer.price || customer.gia_xe);
  const tongThanhToan = formatMoney(customer.price || customer.gia_xe);

  let headerAddress = 'Chi nhánh 1';
  let sellerTitle = 'CÔNG TY TNHH XE ĐIỆN THANH TƯƠI - CHI NHÁNH 1';
  let bankAccount = 'STK: Công ty TNHH Xe điện Thanh Tươi - MBBANK';

  if (selectedBranch === 'Chi nhánh 2') {
    headerAddress = 'Chi nhánh 2';
    sellerTitle = 'CÔNG TY TNHH XE ĐIỆN THANH TƯƠI - CHI NHÁNH 2';
  }

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
      <title>Hop_dong_${hoTen || 'khach_hang'}</title>
      <style>
        @page { size: A4 portrait; margin: 6mm 8mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { margin: 0; padding: 0; background: #fff; font-family: "Times New Roman", Times, serif; font-size: 11px; line-height: 1.35; color: #000; }
        .page { width: 100%; }
        table { width: 100%; border-collapse: collapse; }
        table.main-grid { border: 1px solid #000; margin: 6px 0; table-layout: fixed; }
        table.main-grid td, table.main-grid th { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
        .bold { font-weight: bold; }
        .italic { font-style: italic; }
        .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 3px; }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- HEADER -->
        <table>
          <tbody>
            <tr>
              <td style="width: 45%; vertical-align: top; text-align: center;">
                <strong style="font-size: 11.5px;">CÔNG TY TNHH XE ĐIỆN THANH TƯƠI</strong><br />
                <span style="font-size: 10px;">${headerAddress}</span><br />
                <span style="font-size: 10px;">ĐT: 0939.30.90.91</span>
              </td>
              <td style="width: 55%; vertical-align: top; text-align: center;">
                <strong style="font-size: 11.5px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
                <strong style="font-size: 11px;">Độc lập - Tự do - Hạnh phúc</strong><br />
                <i style="font-size: 10px;">Ngày ${day} tháng ${month} năm ${year}</i>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: center; margin: 6px 0 8px 0;">
          <div class="bold" style="font-size: 14px;">BIÊN NHẬN</div>
          <div class="bold" style="font-size: 11.5px;">(KIÊM HỢP ĐỒNG BÁN XE)</div>
        </div>

        <!-- THÔNG TIN BÊN BÁN & BÊN MUA -->
        <div style="margin-bottom: 4px;">
          <div class="bold">Bên A (Bên bán xe): ${sellerTitle}</div>
          <div>- Địa chỉ / Liên hệ: ${headerAddress} - ĐT: 0939.30.90.91</div>
          <div>- Tài khoản thanh toán: ${bankAccount}</div>
        </div>

        <div style="margin-bottom: 6px;">
          <div class="bold">Bên B (Bên mua xe):</div>
          <div>- Họ và tên: <strong style="font-size: 11.5px;">${hoTen || '...................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Điện thoại: <strong>${dienThoai || '.........................'}</strong></div>
          <div>- Địa chỉ: <strong>${diaChi || '.......................................................................................................................................'}</strong></div>
          <div>- CCCD số: .................................................... Ngày cấp: .................... Nơi cấp: Cục Cảnh sát QLHC về TTXH</div>
        </div>

        <div style="margin-bottom: 6px;">
          Sau khi bàn bạc và đi đến thống nhất, Bên A đồng ý bán và Bên B đồng ý mua sản phẩm xe điện với các điều khoản cụ thể sau đây:
        </div>

        <!-- BẢNG ĐIỀU KHOẢN & THÔNG TIN -->
        <table class="main-grid">
          <thead>
            <tr>
              <th style="width: 32%; text-align: center; font-weight: bold;">I. ĐIỀU KHOẢN BẢO HÀNH</th>
              <th style="width: 36%; text-align: center; font-weight: bold;">II. THÔNG TIN SẢN PHẨM & THANH TOÁN</th>
              <th style="width: 32%; text-align: center; font-weight: bold;">III. HƯỚNG DẪN SỬ DỤNG ẮC QUY / PIN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="bold" style="color: #000;">1. Dòng xe YADEA:</div>
                <div style="margin-bottom: 4px;">- Động cơ, IC, bộ sạc bảo hành 24 tháng.<br>- Bình bảo hành 24 tháng: Lỗi 1 bình đổi cả bộ trong 18 tháng đầu, lỗi bình nào đổi bình đó trong 6 tháng còn lại (hoặc tối đa 20.000km).<br>- Hoặc gói cao cấp: Động cơ, IC, bộ sạc, Pin bảo hành 36 tháng (hoặc 30.000km).</div>
                
                <div class="bold" style="color: #000; margin-top: 6px;">2. Dòng xe BMX, PEGA, DK, SONSU, JP, UNI:</div>
                <div>- Động cơ, IC, bộ sạc bảo hành 12 tháng.<br>- Bình ắc quy bảo hành 12 tháng (phồng bảo hành 06 - 09 tháng tùy hãng, tuân thủ đúng hướng dẫn sử dụng).</div>
              </td>
              <td>
                <div>* Model xe: <strong style="font-size: 11.5px;">${modelXe}</strong></div>
                <div>* Màu sắc: <strong>${mauXe}</strong></div>
                <div>* Số khung: <strong style="font-family: monospace; font-size: 11.5px;">${soKhung}</strong></div>
                <div>* Số ắc quy/pin: <strong style="font-family: monospace;">${soPin}</strong></div>
                <div>* Số động cơ: ........................................</div>
                <div>* Phụ kiện kèm theo: Bộ sạc chính hãng</div>
                <hr style="border: none; border-top: 1px dashed #666; margin: 4px 0;" />
                <div>* Giá niêm yết xe: <strong>${giaXe}</strong></div>
                <div>* Khách mua thêm phụ kiện: ...................</div>
                <div>* Thu xe cũ (nếu có): ............................</div>
                <div>* Đã đặt cọc: ...........................................</div>
                <div>* Hình thức thanh toán: Trả trước / Tiền mặt / Chuyển khoản</div>
                <div style="margin-top: 2px;"><strong style="font-size: 11.5px;">* TỔNG THANH TOÁN: ${tongThanhToan}</strong></div>
              </td>
              <td>
                <div class="italic">
                  <strong>- Lần sạc đầu tiên:</strong> Sau khi sạc đầy (đèn sạc báo xanh), rút sạc ra đợi khoảng 20 phút rồi cắm sạc tiếp tục khoảng 1 tiếng nữa.
                </div>
                <div class="italic" style="margin-top: 4px;">
                  <strong>- Trong quá trình sử dụng:</strong><br />
                  + Chờ khoảng 30 phút sau khi vừa đi về để ắc quy/pin nguội bớt rồi mới tiến hành cắm sạc.<br />
                  + Nên sạc đầy trước khi sử dụng. Hạn chế tối đa tình trạng cạn kiệt bình và không sạc nhồi nhiều lần trong ngày.<br />
                  + Nếu không sử dụng xe trong thời gian dài, tối thiểu mỗi tuần phải sạc điện 1 lần để duy trì tuổi thọ.
                </div>
                <div class="bold" style="font-size: 10px; margin-top: 6px; text-align: center; border-top: 1px solid #000; padding-top: 3px;">
                  ẮC QUY/PIN SẼ XUỐNG CẤP DẦN THEO THỜI GIAN, VUI LÒNG SỬ DỤNG ĐÚNG CÁCH ĐỂ KÉO DÀI ĐỘ BỀN!
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="section-title">IV. QUYỀN LỢI & ƯU ĐÃI</div>
                <div>* Giá bán xe chưa bao gồm lệ phí trước bạ, phí đăng ký biển số và phí dịch vụ (đối với xe máy điện).</div>
                <div>* Dịch vụ bấm biển số trọn gói (không bao gồm bảo hiểm và kẹp biển số): ........................</div>
                <div>* Quà tặng kèm theo: <strong>01 NÓN BẢO HIỂM CHÍNH HÃNG</strong></div>
                <div class="bold italic" style="margin-top: 4px; color: #b71c1c;">* ƯU ĐÃI ĐẶC BIỆT: Miễn phí công cứu hộ tận nơi trong bán kính 15km trong 12 tháng đầu khi xe gặp sự cố KÉO GA KHÔNG CHẠY.</div>
              </td>
              <td colspan="2">
                <div class="section-title">V. ĐIỀU KHOẢN CHUNG & CAM KẾT</div>
                <div>1. Bên B đã kiểm tra kỹ lưỡng tình trạng xe mới 100%, không bị trầy xước, đầy đủ phụ tùng và phụ kiện đi kèm trước khi nhận xe.</div>
                <div>2. Bên B đã được nhân viên Bên A hướng dẫn chi tiết cách vận hành xe, phổ biến chế độ bảo hành, kỹ năng lái xe an toàn và nhận đủ quà tặng khuyến mãi. Bên B đã đọc, hiểu rõ và hoàn toàn đồng ý với toàn bộ các điều khoản quy định tại biên nhận này.</div>
                <div>3. Hợp đồng kiêm biên nhận này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.</div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- LƯU Ý QUAN TRỌNG -->
        <div style="margin-top: 4px; border: 1px solid #000; padding: 4px 6px;">
          <div class="bold" style="text-decoration: underline; margin-bottom: 2px;">CÁC LƯU Ý QUAN TRỌNG KHI BẢO HÀNH & SỬ DỤNG:</div>
          <table style="font-size: 10px; line-height: 1.25;">
            <tbody>
              <tr><td style="width: 12px; vertical-align: top;">✓</td><td class="bold">LUÔN ĐỘI NÓN BẢO HIỂM ĐẠT CHUẨN KHI THAM GIA GIAO THÔNG (Áp dụng cho cả xe đạp điện).</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">CÁC CHI TIẾT HAO MÒN TỰ NHIÊN TRONG QUÁ TRÌNH SỬ DỤNG SẼ KHÔNG THUỘC PHẠM VI BẢO HÀNH.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">TỪ CHỐI BẢO HÀNH ĐỐI VỚI XE ĐÃ TỰ Ý THAY ĐỔI KẾT CẤU, ĐỘ CHẾ HỆ THỐNG ĐIỆN.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">CHẾ ĐỘ BẢO HÀNH LÀ SỬA CHỮA, KHÔNG ÁP DỤNG CHÍNH SÁCH ĐỔI MỚI TOÀN BỘ XE.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">ĐỂ BẢO HÀNH, KHÁCH HÀNG PHẢI ĐƯA XE TRỰC TIẾP ĐẾN CỬA HÀNG ĐỂ KỸ THUẬT VIÊN KIỂM TRA VÀ THÁO RÁP.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold" style="color: #b71c1c;">MỌI SỰ CỐ / VẤN ĐỀ PHÁT SINH TRONG QUÁ TRÌNH SỬ DỤNG PHẢI ĐƯỢC ĐƯA ĐẾN CỬA HÀNG SỚM NHẤT (TRONG VÒNG 1 - 3 NGÀY) ĐỂ ĐƯỢC HỖ TRỢ. QUÁ THỜI GIAN TRÊN, CỬA HÀNG XIN QUYỀN MIỄN TRÁCH NHIỆM GIẢI QUYẾT.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">PHÍ ĐỔI - TRẢ SẢN PHẨM: 30% GIÁ TRỊ XE TRONG VÒNG 30 NGÀY ĐẦU TIÊN TÍNH TỪ NGÀY MUA.</td></tr>
            </tbody>
          </table>
          <div style="text-align: right; font-style: italic; margin-top: 3px; font-size: 10px;">
            Xác nhận: Tôi (Bên B) đã đọc, hiểu rõ và hoàn toàn đồng ý với toàn bộ nội dung thỏa thuận trên.
          </div>
        </div>

        <!-- CHỮ KÝ -->
        <table style="margin-top: 12px; text-align: center;">
          <tbody>
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <strong style="font-size: 11.5px;">ĐẠI DIỆN BÊN BÁN (Bên A)</strong><br />
                <i style="font-size: 10px;">(Ký và ghi rõ họ tên)</i>
                <div style="height: 50px;"></div>
              </td>
              <td style="width: 50%; vertical-align: top;">
                <strong style="font-size: 11.5px;">ĐẠI DIỆN BÊN MUA (Bên B)</strong><br />
                <i style="font-size: 10px;">(Ký và ghi rõ họ tên)</i>
                <div style="height: 50px;"></div>
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<SystemAccount | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<SystemAccount[]>(DEFAULT_FIXED_ACCOUNTS);
  const [activeTab, setActiveTab] = useState<string>('customers');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [selectedAccountToEdit, setSelectedAccountToEdit] = useState<SystemAccount | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportForm] = Form.useForm();
  const [form] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedPrintCustomer, setSelectedPrintCustomer] = useState<Customer | null>(null);
  const [selectedBranchToPrint, setSelectedBranchToPrint] = useState<string>('Chi nhánh 1');

  const fetchAccountsFromCloud = async () => {
    try {
      const { data, error } = await supabase.from('Account').select('*');
      if (!error && data && data.length > 0) {
        const cloudAccounts: SystemAccount[] = data.map((item: any) => ({
          username: item.username,
          password: item.password,
          fullName: item.fullName || item.fullname || item.username,
          branch: item.branch,
          role: item.role || (item.username === 'admin' ? 'admin' : 'staff'),
        }));
        setAccounts(cloudAccounts);
      }
    } catch (err) {
      console.error('Lỗi tải tài khoản từ Supabase:', err);
    }
  };

  useEffect(() => {
    fetchAccountsFromCloud();
  }, []);

  const handleLogin = async (values: any) => {
    setAuthLoading(true);
    const { username, password } = values;
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { data, error } = await supabase
        .from('Account')
        .select('*')
        .ilike('username', cleanUsername)
        .eq('password', cleanPassword)
        .maybeSingle();

      if (!error && data) {
        const loggedInUser: SystemAccount = {
          username: data.username,
          password: data.password,
          fullName: data.fullName || data.fullname || data.username,
          branch: data.branch,
          role: data.role || (data.username === 'admin' ? 'admin' : 'staff'),
        };
        message.success(`Đăng nhập thành công: ${loggedInUser.fullName}!`);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setCurrentUser(loggedInUser);

        await logActivity({
          actionType: 'LOGIN',
          description: `Đăng nhập vào hệ thống (${loggedInUser.fullName})`,
          user: {
            username: loggedInUser.username,
            fullName: loggedInUser.fullName,
            branch: loggedInUser.branch,
          },
        });

        setAuthLoading(false);
        return;
      }
    } catch (err) {
      console.error('Lỗi xác thực Supabase:', err);
    }

    message.error('Tên tài khoản hoặc mật khẩu không chính xác!');
    setAuthLoading(false);
  };

  const handleChangePassword = async (values: any) => {
    if (!selectedAccountToEdit) return;
    const { newPassword } = values;
    const cleanNewPassword = newPassword.trim();

    try {
      const { error } = await supabase
        .from('Account')
        .update({ password: cleanNewPassword })
        .eq('username', selectedAccountToEdit.username);

      if (error) {
        message.error('Lỗi khi cập nhật mật khẩu lên Cloud: ' + error.message);
        return;
      }

      message.success(`Đã đổi mật khẩu cho tài khoản [${selectedAccountToEdit.username}] thành công!`);
      
      await logActivity({
        actionType: 'STATUS_CHANGE',
        description: `Đổi mật khẩu tài khoản [${selectedAccountToEdit.username}]`,
      });

      setIsPasswordModalOpen(false);
      passwordForm.resetFields();
      await fetchAccountsFromCloud();

      if (currentUser?.username === selectedAccountToEdit.username) {
        const updatedCurrent = { ...currentUser, password: cleanNewPassword };
        setCurrentUser(updatedCurrent);
        localStorage.setItem('currentUser', JSON.stringify(updatedCurrent));
      }
    } catch (err: any) {
      message.error('Lỗi kết nối máy chủ Supabase: ' + err.message);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await logActivity({
        actionType: 'LOGOUT',
        description: `Đăng xuất khỏi hệ thống (${currentUser.fullName})`,
      });
    }
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    loginForm.resetFields();
    message.info('Đã đăng xuất khỏi hệ thống');
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_API_URL}/customers?limit=100000&pageSize=100000`);
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setCustomers(response.data.data);
      } else if (Array.isArray(response.data)) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      message.error('Không thể tải dữ liệu từ máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCustomers();
    }
  }, [currentUser]);

  const staffOptions = useMemo(() => {
    const staffSet = new Set<string>();
    customers.forEach((c) => {
      const name = c.staffName || c.nhan_vien;
      if (name && name.trim()) staffSet.add(name.trim());
    });
    return Array.from(staffSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  const branchOptions = useMemo(() => {
    return [
      { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
      { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
    ];
  }, []);

  const brandOptions = useMemo(() => {
    const brandSet = new Set<string>();
    customers.forEach((c) => {
      const fullVName = extractVehicleInfo(c);
      const b = (c.brand || fullVName.split(' ')[0] || '').trim();
      if (b && b !== '---') brandSet.add(b);
    });
    return Array.from(brandSet).map((b) => ({ label: b, value: b }));
  }, [customers]);

  const handleOpenPrintModal = (record: Customer) => {
    setSelectedPrintCustomer(record);
    const currentBranch = (record.branchName || record.chi_nhanh || '').trim().toLowerCase();
    if (currentBranch.includes('2')) {
      setSelectedBranchToPrint('Chi nhánh 2');
    } else {
      setSelectedBranchToPrint('Chi nhánh 1');
    }
    setIsPrintModalOpen(true);
  };

  const handleConfirmPrint = () => {
    if (selectedPrintCustomer) {
      executePrintContract(selectedPrintCustomer, selectedBranchToPrint);
      setIsPrintModalOpen(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    form.resetFields();
    if (currentUser) {
      form.setFieldsValue({
        branchName: currentUser.branch || 'Chi nhánh 1',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: Customer) => {
    setEditingCustomer(record);
    const fullVName = extractVehicleInfo(record);
    const nameParts = fullVName !== '---' ? fullVName.split(' ') : [];
    const brand = record.brand || nameParts[0] || '';
    const model = record.model || nameParts.slice(1).join(' ') || '';

    form.setFieldsValue({
      fullName: record.fullName || record.ho_ten || '',
      phone: record.phone || record.dien_thoai || '',
      address: record.address || record.dia_chi || '',
      brand,
      model,
      color: record.color || record.mau || '',
      price: record.price ? Number(record.price) : (record.gia_xe ? Number(record.gia_xe) : 0),
      staffName: record.staffName || record.nhan_vien || '',
      branchName: record.branchName || record.chi_nhanh || 'Chi nhánh 1',
      frameNumber: record.frameNumber || record.so_khung || '',
      batteryNumber: record.batteryNumber || record.so_pin || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    setSubmitting(true);

    const rawPrice = values.price;
    let parsedPrice = 0;
    if (typeof rawPrice === 'number') {
      parsedPrice = Math.round(rawPrice);
    } else if (typeof rawPrice === 'string') {
      parsedPrice = parseInt(rawPrice.replace(/[^0-9]/g, ''), 10) || 0;
    }

    const payload = {
      fullName: values.fullName?.trim() || '',
      phone: values.phone?.trim() || '',
      address: values.address?.trim() || '',
      brand: values.brand?.trim() || '',
      model: values.model?.trim() || '',
      color: values.color?.trim() || '',
      frameNumber: values.frameNumber?.trim() || '',
      batteryNumber: values.batteryNumber?.trim() || '',
      price: parsedPrice,
      staffName: values.staffName?.trim() || '',
      branchName: values.branchName || 'Chi nhánh 1',
      vehicleName: `${values.brand || ''} ${values.model || ''}`.trim(),
      ho_ten: values.fullName?.trim() || '',
      dien_thoai: values.phone?.trim() || '',
      dia_chi: values.address?.trim() || '',
      mau: values.color?.trim() || '',
      gia_xe: parsedPrice,
      nhan_vien: values.staffName?.trim() || '',
      chi_nhanh: values.branchName || 'Chi nhánh 1',
      so_khung: values.frameNumber?.trim() || '',
      so_pin: values.batteryNumber?.trim() || '',
    };

    try {
      if (editingCustomer && editingCustomer.id) {
        await axios.put(`${BASE_API_URL}/customers/${editingCustomer.id}`, payload);
        message.success('Cập nhật thành công!');

        await logActivity({
          actionType: 'STATUS_CHANGE',
          description: `Sửa thông tin khách hàng: [${values.fullName}] - SĐT: [${values.phone}]`,
        });
      } else {
        await axios.post(`${BASE_API_URL}/customers`, payload);
        message.success('Thêm mới thành công!');

        const frameNum = (values.frameNumber || '').trim();
        const branch = values.branchName || currentUser?.branch || 'Chi nhánh 1';

        await logActivity({
          actionType: 'SALE',
          description: `Bán xe [${values.brand || ''} ${values.model || ''}] - Khách: [${values.fullName}] - Số khung: [${frameNum || 'N/A'}] - Chi nhánh: [${branch}]`,
        });

        if (frameNum) {
          try {
            const { data: invItem } = await supabase
              .from('Inventory')
              .select('*')
              .eq('frame_number', frameNum)
              .maybeSingle();

            if (invItem) {
              await supabase
                .from('Inventory')
                .update({
                  status: 'sold',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', invItem.id);

              await supabase.from('InventoryLog').insert([
                {
                  type: 'sale',
                  brand: invItem.brand,
                  model: invItem.model,
                  color: invItem.color,
                  quantity: 1,
                  from_branch: branch,
                  note: `Bán xe số khung: ${frameNum} cho khách ${values.fullName || 'Khách lẻ'}`,
                  created_by: currentUser?.fullName,
                },
              ]);
              message.info(`Đã cập nhật xe số khung [${frameNum}] sang trạng thái ĐÃ BÁN.`);
            }
          } catch (invErr) {
            console.warn('Lỗi cập nhật tồn kho Supabase:', invErr);
          }
        }
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchCustomers();
    } catch (error: any) {
      console.error('Lỗi chi tiết từ Server:', error.response?.data || error);
      const errorDetail =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Internal Server Error';
      message.error(`Lỗi Server (500): ${errorDetail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      const targetCustomer = customers.find((c) => c.id === id);
      await axios.delete(`${BASE_API_URL}/customers/${id}`);
      message.success('Đã xóa thành công!');

      await logActivity({
        actionType: 'DELETE',
        description: `Xóa hồ sơ khách hàng: [${targetCustomer?.fullName || targetCustomer?.ho_ten || id}] - SĐT: [${targetCustomer?.phone || 'N/A'}]`,
      });

      fetchCustomers();
    } catch {
      message.error('Xóa thất bại!');
    }
  };

  const handleExportExcel = async (values: any) => {
    const { dateRange, staffName, branchName } = values;
    const hideLoading = message.loading('Đang tải toàn bộ dữ liệu để xuất Excel...', 0);

    try {
      let allCustomers: Customer[] = [];
      const response = await axios.get(`${BASE_API_URL}/customers?limit=100000&pageSize=100000`);

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        allCustomers = response.data.data;
      } else if (Array.isArray(response.data)) {
        allCustomers = response.data;
      } else {
        allCustomers = [...customers];
      }

      let filtered = [...allCustomers];

      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');

        filtered = filtered.filter((item) => {
          const { fullDate } = parseDateDetails(item);
          if (!fullDate || fullDate === '---') return false;

          const itemDate = dayjs(fullDate, 'DD/MM/YYYY');
          if (!itemDate.isValid()) return false;

          return (
            (itemDate.isAfter(startDate) || itemDate.isSame(startDate)) &&
            (itemDate.isBefore(endDate) || itemDate.isSame(endDate))
          );
        });
      }

      if (staffName) {
        filtered = filtered.filter((item) => (item.staffName || item.nhan_vien) === staffName);
      }
      if (branchName) {
        filtered = filtered.filter((item) => (item.branchName || item.chi_nhanh) === branchName);
      }

      hideLoading();

      if (filtered.length === 0) {
        message.warning('Không tìm thấy dữ liệu phù hợp với bộ lọc!');
        return;
      }

      const excelData = filtered.map((item, index) => {
        const { fullDate } = parseDateDetails(item);
        return {
          'STT': index + 1,
          'ID Đơn': `#${item.id || index + 1}`,
          'Thời Gian Mua': fullDate,
          'Khách Hàng': item.fullName || item.ho_ten || '---',
          'Số Điện Thoại': item.phone || item.dien_thoai || '---',
          'Địa Chỉ': item.address || item.dia_chi || '---',
          'Tên Xe / Hãng': extractVehicleInfo(item),
          'Màu Sắc': item.color || item.mau || '---',
          'Số Khung': item.frameNumber || item.so_khung || '---',
          'Số Acquy': item.batteryNumber || item.so_pin || '---',
          'Giá Bán (VNĐ)': item.price
            ? Number(item.price).toLocaleString('vi-VN')
            : item.gia_xe
            ? Number(item.gia_xe).toLocaleString('vi-VN')
            : '0',
          'Nhân Viên': item.staffName || item.nhan_vien || '---',
          'Chi Nhánh': item.branchName || item.chi_nhanh || '---',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 10 },
        { wch: 16 },
        { wch: 25 },
        { wch: 15 },
        { wch: 40 },
        { wch: 25 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 20 },
        { wch: 18 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachKhachHang');
      XLSX.writeFile(workbook, `Danh_Sach_Khach_Hang_${dayjs().format('DDMMYYYY_HHmmss')}.xlsx`);

      message.success(`Đã xuất thành công toàn bộ ${filtered.length} dòng dữ liệu!`);
      setIsExportModalOpen(false);
    } catch (error) {
      hideLoading();
      message.error('Lỗi khi tải toàn bộ dữ liệu xuất Excel!');
      console.error(error);
    }
  };

  const filteredCustomers = customers.filter((item) => {
    const searchLower = searchText.toLowerCase();
    const fullVehicleName = extractVehicleInfo(item);
    const name = item.fullName || item.ho_ten || '';
    const phone = item.phone || item.dien_thoai || '';
    const address = item.address || item.dia_chi || '';
    const color = item.color || item.mau || '';
    const frameNumber = item.frameNumber || item.so_khung || '';
    const batteryNumber = item.batteryNumber || item.so_pin || '';
    const staff = item.staffName || item.nhan_vien || '';
    const branch = item.branchName || item.chi_nhanh || '';

    return (
      name.toLowerCase().includes(searchLower) ||
      phone.includes(searchLower) ||
      address.toLowerCase().includes(searchLower) ||
      color.toLowerCase().includes(searchLower) ||
      fullVehicleName.toLowerCase().includes(searchLower) ||
      frameNumber.toLowerCase().includes(searchLower) ||
      batteryNumber.toLowerCase().includes(searchLower) ||
      staff.toLowerCase().includes(searchLower) ||
      branch.toLowerCase().includes(searchLower)
    );
  });

  const columns: ColumnsType<Customer> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id?: number) => <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>#{id || '---'}</Text>,
      width: 65,
      align: 'center',
    },
    {
      title: 'THỜI GIAN MUA',
      dataIndex: 'formTimestamp',
      key: 'formTimestamp',
      render: (_: any, record: Customer) => {
        const { fullDate } = parseDateDetails(record);
        return (
          <Text style={{ fontSize: '13px', color: '#1677ff', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {fullDate}
          </Text>
        );
      },
      width: 125,
      align: 'center',
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (_: any, record: Customer) => (
        <span style={{ fontWeight: 600, color: '#1f1f1f' }}>
          {record.fullName || record.ho_ten || '---'}
        </span>
      ),
      width: 170,
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      render: (_: any, record: Customer) => {
        const phoneVal = record.phone || record.dien_thoai || '';
        return (
          <a href={`tel:${phoneVal}`} style={{ color: '#1677ff', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {phoneVal || '---'}
          </a>
        );
      },
      width: 120,
    },
    {
      title: 'ĐỊA CHỈ',
      dataIndex: 'address',
      key: 'address',
      render: (_: any, record: Customer) => <span style={{ fontSize: '13px', color: '#595959' }}>{record.address || record.dia_chi || '---'}</span>,
      width: 250,
    },
    {
      title: 'TÊN XE / HÃNG',
      key: 'vehicleName',
      render: (_: any, record: Customer) => {
        const name = extractVehicleInfo(record);
        return <strong style={{ color: '#262626', whiteSpace: 'nowrap' }}>{name}</strong>;
      },
      width: 170,
    },
    {
      title: 'MÀU XE',
      dataIndex: 'color',
      key: 'color',
      render: (_: any, record: Customer) => {
        const colorVal = record.color || record.mau;
        return colorVal ? (
          <Tag color="cyan" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
            {colorVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'SỐ KHUNG',
      dataIndex: 'frameNumber',
      key: 'frameNumber',
      render: (_: any, record: Customer) => {
        const frameVal = record.frameNumber || record.so_khung;
        return frameVal ? <Text code style={{ color: '#d46b08', fontWeight: 600, whiteSpace: 'nowrap' }}>{frameVal}</Text> : <Text type="secondary">---</Text>;
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'SỐ ACQUY',
      dataIndex: 'batteryNumber',
      key: 'batteryNumber',
      render: (_: any, record: Customer) => {
        const batVal = record.batteryNumber || record.so_pin;
        return batVal ? <Text code style={{ color: '#389e0d', fontWeight: 600, whiteSpace: 'nowrap' }}>{batVal}</Text> : <Text type="secondary">---</Text>;
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'GIÁ BÁN',
      dataIndex: 'price',
      key: 'price',
      render: (_: any, record: Customer) => {
        const numPrice = Number(record.price || record.gia_xe);
        if (!isNaN(numPrice) && numPrice > 0) {
          return (
            <span style={{ fontWeight: 600, color: '#389e0d', whiteSpace: 'nowrap' }}>
              {numPrice.toLocaleString('vi-VN')} VNĐ
            </span>
          );
        }
        return <Text type="secondary">---</Text>;
      },
      width: 140,
      align: 'right',
    },
    {
      title: 'NHÂN VIÊN',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (_: any, record: Customer) => {
        const staffVal = record.staffName || record.nhan_vien;
        return staffVal ? (
          <Tag color="gold" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {staffVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 120,
      align: 'center',
    },
    {
      title: 'CHI NHÁNH',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (_: any, record: Customer) => {
        const branchVal = record.branchName || record.chi_nhanh;
        return branchVal ? (
          <Tag color="blue" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {branchVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      render: (_: any, record: Customer) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<PrinterOutlined />}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: 4, fontWeight: 500 }}
            onClick={() => handleOpenPrintModal(record)}
          >
            In HD
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)}>
            Sửa
          </Button>
          {currentUser?.role === 'admin' && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc chắn muốn xóa khách hàng này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
      width: 180,
      align: 'center',
    },
  ];

  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #096dd9 0%, #001529 100%)',
          padding: '12px',
          boxSizing: 'border-box',
        }}
      >
        <Card
          bordered={false}
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 16,
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            padding: '24px 16px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                background: '#e6f7ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#1890ff',
                fontSize: 28,
              }}
            >
              <ShopOutlined />
            </div>
            <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 700 }}>
              XE ĐIỆN TÙNG PHƯỢNG
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Hệ thống Quản lý Bán xe & In Hợp đồng
            </Text>
          </div>

          <Form form={loginForm} layout="vertical" onFinish={handleLogin} size="large">
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản!' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Tài khoản (admin / chinhanh1 / chinhanh2...)"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Mật khẩu"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={authLoading}
                block
                style={{
                  height: 44,
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                  backgroundColor: '#1890ff',
                }}
              >
                ĐĂNG NHẬP HỆ THỐNG
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'customers',
      label: (
        <span>
          <OrderedListOutlined /> Danh Sách Khách Hàng ({customers.length})
        </span>
      ),
      children: (
        <div style={{ width: '100%', overflowX: 'hidden' }}>
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="Tìm theo tên khách, SĐT, địa chỉ, màu sắc, tên xe, Số Khung, Số Acquy hoặc chi nhánh..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              allowClear
              size="middle"
              style={{ borderRadius: 8, width: '100%', maxWidth: 600 }}
            />
          </div>

          <Table<Customer>
            dataSource={filteredCustomers}
            columns={columns}
            rowKey={(record) => record.id || Math.random()}
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng cộng ${total} khách hàng`,
              showSizeChanger: false,
              simple: window.innerWidth < 768,
            }}
            scroll={{ x: 1750 }}
            size="small"
          />
        </div>
      ),
    },
    {
      key: 'inventory',
      label: (
        <span>
          <InboxOutlined /> Quản Lý Tồn Kho & Luân Chuyển
        </span>
      ),
      children: <InventoryManagement currentUser={currentUser} />,
    },
    ...(currentUser.role === 'admin'
      ? [
          {
            key: 'analytics',
            label: (
              <span>
                <BarChartOutlined /> Báo Cáo & Thống Kê Doanh Số Chi Nhánh
              </span>
            ),
            children: (
              <SalesAnalytics
                customers={customers}
                brandOptions={brandOptions}
                parseDateDetails={parseDateDetails}
              />
            ),
          },
          {
            key: 'activity-log',
            label: (
              <span>
                <HistoryOutlined /> Lịch Sử Thao Tác
              </span>
            ),
            children: <ActivityLogView />,
          },
        ]
      : []),
  ];

  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: '#f0f2f5',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Card
        bordered={false}
        bodyStyle={{ padding: window.innerWidth < 768 ? '12px 8px' : '20px' }}
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          width: '100%',
          maxWidth: 1600,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
            gap: '12px',
            marginBottom: 16,
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: 12,
            width: '100%',
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, fontSize: window.innerWidth < 768 ? '18px' : '22px', color: '#1f1f1f' }}>
              XE ĐIỆN TÙNG PHƯỢNG - HỆ THỐNG QUẢN LÝ BÁN XE & IN HỢP ĐỒNG
            </Title>
            <Space wrap style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Đang làm việc: <strong>{currentUser.fullName}</strong>
              </Text>
              <Tag color={currentUser.role === 'admin' ? 'red' : 'blue'}>
                {currentUser.role === 'admin' ? '👑 Admin' : `CN: ${currentUser.branch}`}
              </Tag>
            </Space>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              width: window.innerWidth < 768 ? '100%' : 'auto',
            }}
          >
            {currentUser.role === 'admin' && (
              <Button
                type="primary"
                style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', borderRadius: 6, fontWeight: 500 }}
                icon={<SafetyCertificateOutlined />}
                onClick={() => {
                  fetchAccountsFromCloud();
                  setSelectedAccountToEdit(accounts[0]);
                  setIsPasswordModalOpen(true);
                }}
              >
                Đổi MK Cloud
              </Button>
            )}

            <Button
              type="primary"
              style={{ backgroundColor: '#217346', borderColor: '#217346', borderRadius: 6, fontWeight: 500 }}
              icon={<FileExcelOutlined />}
              onClick={() => {
                exportForm.resetFields();
                setIsExportModalOpen(true);
              }}
            >
              Xuất Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ borderRadius: 6, fontWeight: 500 }}>
              Thêm mới
            </Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchCustomers} style={{ borderRadius: 6 }}>
              Tải lại
            </Button>
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 6 }}>
              Đăng xuất
            </Button>
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k)}
          type="card"
          items={tabItems}
        />
      </Card>

      {/* Modal Admin Đổi Mật Khẩu */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />
            <span>Quản Lý Mật Khẩu Tài Khoản (Đồng Bộ Cloud)</span>
          </Space>
        }
        open={isPasswordModalOpen}
        onCancel={() => setIsPasswordModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: '750px' }}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Mật khẩu được lưu trực tiếp trên Cloud. Khi Admin đổi mật khẩu tại đây, tất cả thiết bị khác đều phải dùng mật khẩu mới để đăng nhập.
          </Text>
        </div>

        <Table<SystemAccount>
          dataSource={accounts}
          rowKey="username"
          pagination={false}
          size="small"
          bordered
          columns={[
            {
              title: 'TÊN TÀI KHOẢN',
              dataIndex: 'username',
              key: 'username',
              render: (text, record) => (
                <Space>
                  <Text code strong>{text}</Text>
                  {record.role === 'admin' && <Tag color="red">Admin</Tag>}
                </Space>
              ),
            },
            {
              title: 'TÊN CHI NHÁNH',
              dataIndex: 'fullName',
              key: 'fullName',
            },
            {
              title: 'MẬT KHẨU',
              dataIndex: 'password',
              key: 'password',
              render: (pwd) => <Text copyable={{ text: pwd }}>••••••</Text>,
            },
            {
              title: 'THAO TÁC',
              key: 'action',
              render: (_, record) => (
                <Button
                  size="small"
                  icon={<KeyOutlined />}
                  onClick={() => {
                    setSelectedAccountToEdit(record);
                    passwordForm.resetFields();
                  }}
                >
                  Đổi MK
                </Button>
              ),
            },
          ]}
        />

        {selectedAccountToEdit && (
          <Card
            type="inner"
            title={`Đổi mật khẩu cho: [${selectedAccountToEdit.username}] - ${selectedAccountToEdit.fullName}`}
            style={{ marginTop: 16 }}
          >
            <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
              <Form.Item
                name="newPassword"
                rules={[
                  { required: true, message: 'Nhập MK mới!' },
                  { min: 4, message: 'Tối thiểu 4 ký tự!' },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới..." style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Lưu Lên Toàn Hệ Thống
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}
      </Modal>

      {/* Modal Chọn Chi Nhánh In Hợp Đồng */}
      <Modal
        title={
          <Space>
            <ShopOutlined style={{ color: '#722ed1' }} />
            <span>Chọn Chi Nhánh In Hợp Đồng</span>
          </Space>
        }
        open={isPrintModalOpen}
        onCancel={() => setIsPrintModalOpen(false)}
        onOk={handleConfirmPrint}
        okText="In Hợp Đồng Ngay"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#722ed1', borderColor: '#722ed1' } }}
        destroyOnClose
        width="95%"
        style={{ maxWidth: '420px' }}
      >
        <div style={{ padding: '12px 0' }}>
          <Text style={{ display: 'block', marginBottom: 10 }}>
            Khách hàng: <strong>{selectedPrintCustomer?.fullName || selectedPrintCustomer?.ho_ten}</strong>
          </Text>
          <Text style={{ display: 'block', marginBottom: 8, color: '#595959' }}>
            Vui lòng chọn chi nhánh xuất hợp đồng:
          </Text>
          <Radio.Group
            value={selectedBranchToPrint}
            onChange={(e) => setSelectedBranchToPrint(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <Radio value="Chi nhánh 1"><strong>Chi nhánh 1</strong></Radio>
            <Radio value="Chi nhánh 2"><strong>Chi nhánh 2</strong></Radio>
          </Radio.Group>
        </div>
      </Modal>

      {/* Modal Thêm / Sửa */}
      <Modal
        title={editingCustomer ? `Sửa thông tin #${editingCustomer.id}` : 'Thêm Mới Khách Hàng'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        width="95%"
        style={{ maxWidth: '600px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="fullName" label="Tên khách hàng" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ..." />
          </Form.Item>
          <Form.Item name="brand" label="Hãng xe">
            <Input />
          </Form.Item>
          <Form.Item name="model" label="Model xe">
            <Input />
          </Form.Item>
          <Form.Item name="color" label="Màu xe">
            <Input placeholder="Nhập màu xe (vd: Xám bóng, Trắng đen...)" />
          </Form.Item>
          <Form.Item name="frameNumber" label="Số Khung">
            <Input placeholder="Nhập số khung..." />
          </Form.Item>
          <Form.Item name="batteryNumber" label="Số Acquy">
            <Input placeholder="Nhập số acquy..." />
          </Form.Item>
          <Form.Item name="price" label="Giá bán (VNĐ)">
            <InputNumber
              style={{ width: '100%' }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(val) => val?.replace(/\./g, '') as unknown as number}
            />
          </Form.Item>
          <Form.Item name="staffName" label="Nhân viên">
            <Input />
          </Form.Item>
          <Form.Item name="branchName" label="Chi nhánh">
            <Select
              options={[
                { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
                { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
              ]}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingCustomer ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Xuất Excel */}
      <Modal
        title={
          <Space>
            <FilterOutlined style={{ color: '#217346' }} />
            <span>Tùy Chọn Lọc Xuất File Excel</span>
          </Space>
        }
        open={isExportModalOpen}
        onCancel={() => setIsExportModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        <Form form={exportForm} layout="vertical" onFinish={handleExportExcel} style={{ marginTop: 16 }}>
          <Form.Item name="dateRange" label="Khoảng thời gian mua xe (Từ ngày -> Đến ngày)">
            <RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder={['Từ ngày', 'Đến ngày']} />
          </Form.Item>

          <Form.Item name="staffName" label="Lọc theo Nhân viên">
            <Select allowClear placeholder="Tất cả nhân viên" options={staffOptions} showSearch />
          </Form.Item>

          <Form.Item name="branchName" label="Lọc theo Chi nhánh">
            <Select allowClear placeholder="Tất cả chi nhánh" options={branchOptions} showSearch />
          </Form.Item>

          <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: '13px' }}>
            💡 Mẹo: Bạn có thể để trống các ô nếu muốn xuất toàn bộ dữ liệu.
          </Text>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsExportModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<FileExcelOutlined />}
              style={{ backgroundColor: '#217346', borderColor: '#217346' }}
            >
              Tải File Excel
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}