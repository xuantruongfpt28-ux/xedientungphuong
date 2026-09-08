import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Tabs,
  Typography,
  Upload,
  Popconfirm,
  Alert,
} from 'antd';
import {
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShopOutlined,
  CarOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  DeleteOutlined,
  BarcodeOutlined,
  CheckSquareOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';
import { logActivity } from '../utils/logger';
import type { SystemAccount, Customer } from '../App';

const { Text } = Typography;
const BASE_API_URL = import.meta.env.VITE_API_URL || 'https://xedienthanhtuoi.vercel.app/api';

export interface VehicleStockItem {
  id?: number;
  frame_number: string;
  battery_number?: string;
  branch: string;
  brand: string;
  model: string;
  color: string;
  status: 'in_stock' | 'sold' | 'transferring';
  imported_at?: string;
  updated_at?: string;
}

interface ExcelVehicleRow {
  branch: string;
  brand: string;
  model: string;
  color: string;
  frame_number: string;
  battery_number?: string;
  note?: string;
}

interface InventoryManagementProps {
  currentUser: SystemAccount;
  customers?: Customer[];
}

const cleanFrameStr = (str?: string): string => {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
};

// Hàm chuẩn hóa tên chi nhánh về Chi nhánh 1 hoặc Chi nhánh 2
const normalizeBranchName = (rawBranch?: string): string => {
  if (!rawBranch) return 'Chi nhánh 1';
  const str = rawBranch.trim().toLowerCase();
  if (str.includes('2') || str.includes('cn2') || str.includes('chi nhánh 2')) {
    return 'Chi nhánh 2';
  }
  return 'Chi nhánh 1';
};

export const InventoryManagement = ({ currentUser, customers = [] }: InventoryManagementProps) => {
  const [vehicleList, setVehicleList] = useState<VehicleStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Mặc định chọn 'all' (Tất cả chi nhánh)
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('in_stock');
  const [searchText, setSearchText] = useState('');

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBatchTransferModalOpen, setIsBatchTransferModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<ExcelVehicleRow[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [importForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [batchTransferForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invError } = await supabase
        .from('Inventory')
        .select('*')
        .order('id', { ascending: false });
      
      if (!invError && invData) {
        const normalizedInv = invData.map((item) => ({
          ...item,
          branch: normalizeBranchName(item.branch),
        }));
        setVehicleList(normalizedInv);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách xe tồn kho!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncSoldStatus = async (showSuccessMsg = true) => {
    setSyncing(true);
    const hide = showSuccessMsg ? message.loading('Đang quét chính xác số khung các đơn bán...', 0) : () => {};

    try {
      let allSales: Customer[] = customers;
      if (!allSales || allSales.length === 0) {
        const res = await axios.get(`${BASE_API_URL}/customers?limit=100000&pageSize=100000`);
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          allSales = res.data.data;
        } else if (Array.isArray(res.data)) {
          allSales = res.data;
        }
      }

      if (!allSales || allSales.length === 0) {
        hide();
        setSyncing(false);
        if (showSuccessMsg) message.warning('Chưa có dữ liệu đơn hàng nào!');
        return;
      }

      const soldFrameMap = new Map<string, Customer>();
      allSales.forEach((c) => {
        const raw = (c.frameNumber || c.so_khung || '').trim();
        const clean = cleanFrameStr(raw);
        if (clean && clean !== '---' && clean.length >= 5) {
          soldFrameMap.set(clean, c);
        }
      });

      const { data: stockItems, error: stockErr } = await supabase
        .from('Inventory')
        .select('*')
        .eq('status', 'in_stock');

      if (stockErr || !stockItems) {
        hide();
        setSyncing(false);
        if (showSuccessMsg) message.error('Lỗi truy vấn kho xe!');
        return;
      }

      const matchedToSold: { item: VehicleStockItem; customer: Customer }[] = [];

      stockItems.forEach((inv) => {
        const invClean = cleanFrameStr(inv.frame_number);
        if (!invClean) return;

        if (soldFrameMap.has(invClean)) {
          matchedToSold.push({ item: inv, customer: soldFrameMap.get(invClean)! });
        }
      });

      if (matchedToSold.length > 0) {
        for (const m of matchedToSold) {
          await supabase
            .from('Inventory')
            .update({
              status: 'sold',
              updated_at: new Date().toISOString(),
            })
            .eq('id', m.item.id);

          await supabase.from('InventoryLog').insert([
            {
              type: 'sale',
              brand: m.item.brand,
              model: m.item.model,
              color: m.item.color,
              quantity: 1,
              from_branch: normalizeBranchName(m.item.branch),
              note: `Đồng bộ chính xác bán xe SK: ${m.item.frame_number} cho khách ${m.customer.fullName || m.customer.ho_ten || 'Khách mua'}`,
              created_by: 'Hệ thống tự động',
            },
          ]);
        }

        const matchedFrames = matchedToSold.map((m) => m.item.frame_number).join(', ');
        await logActivity({
          actionType: 'SALE',
          description: `Đồng bộ đơn bán: Cập nhật ${matchedToSold.length} xe sang ĐÃ BÁN [${matchedFrames}]`,
          user: currentUser,
        });

        hide();
        if (showSuccessMsg) {
          message.success(`Đã cập nhật chính xác ${matchedToSold.length} xe sang ĐÃ BÁN!`);
        }
        await fetchData();
      } else {
        hide();
        if (showSuccessMsg) {
          message.info('Không có xe mới nào khớp với danh sách đơn bán.');
        }
      }
    } catch (err: any) {
      hide();
      console.error(err);
      if (showSuccessMsg) message.error('Lỗi khi đồng bộ: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const selectedVehicles = useMemo(() => {
    return vehicleList.filter((v) => v.id && selectedRowKeys.includes(v.id));
  }, [vehicleList, selectedRowKeys]);

  const handleToggleStatus = async (record: VehicleStockItem) => {
    const newStatus = record.status === 'in_stock' ? 'sold' : 'in_stock';
    try {
      const { error } = await supabase
        .from('Inventory')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (error) throw error;

      await logActivity({
        actionType: 'STATUS_CHANGE',
        description: `Đổi trạng thái xe [${record.frame_number}] (${record.brand} ${record.model}) sang: ${newStatus === 'in_stock' ? 'TRONG KHO' : 'ĐÃ BÁN'}`,
        user: currentUser,
      });

      message.success(`Đã đổi xe [${record.frame_number}] thành: ${newStatus === 'in_stock' ? 'TRONG KHO' : 'ĐÃ BÁN'}`);
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi đổi trạng thái: ' + err.message);
    }
  };

  const handleDeleteVehicle = async (item: VehicleStockItem) => {
    try {
      const { error } = await supabase.from('Inventory').delete().eq('id', item.id);
      if (error) throw error;

      await supabase.from('InventoryLog').insert([
        {
          type: 'delete',
          brand: item.brand,
          model: item.model,
          color: item.color,
          quantity: 1,
          from_branch: normalizeBranchName(item.branch),
          note: `Xóa xe số khung: ${item.frame_number}`,
          created_by: currentUser.fullName,
        },
      ]);

      await logActivity({
        actionType: 'DELETE',
        description: `Xóa xe số khung [${item.frame_number}] (${item.brand} ${item.model}) tại chi nhánh [${item.branch}]`,
        user: currentUser,
      });

      message.success(`Đã xóa xe số khung [${item.frame_number}] khỏi hệ thống!`);
      setSelectedRowKeys((prev) => prev.filter((key) => key !== item.id));
      fetchData();
    } catch (err: any) {
      message.error('Xóa thất bại: ' + err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setSubmitting(true);
    const hide = message.loading(`Đang xóa ${selectedRowKeys.length} xe đã chọn...`, 0);

    try {
      const idsToDelete = selectedRowKeys;
      const { error } = await supabase.from('Inventory').delete().in('id', idsToDelete);
      if (error) throw error;

      for (const item of selectedVehicles) {
        await supabase.from('InventoryLog').insert([
          {
            type: 'delete',
            brand: item.brand,
            model: item.model,
            color: item.color,
            quantity: 1,
            from_branch: normalizeBranchName(item.branch),
            note: `Xóa hàng loạt xe SK: ${item.frame_number}`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      const frameListStr = selectedVehicles.map((v) => v.frame_number).join(', ');
      await logActivity({
        actionType: 'DELETE',
        description: `Xóa hàng loạt ${selectedVehicles.length} xe số khung: [${frameListStr}]`,
        user: currentUser,
      });

      hide();
      message.success(`Đã xóa thành công ${idsToDelete.length} xe!`);
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi xóa hàng loạt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchTransferSubmit = async (values: any) => {
    if (selectedRowKeys.length === 0) return;
    setSubmitting(true);
    const { toBranch, note } = values;
    const hide = message.loading(`Đang chuyển ${selectedRowKeys.length} xe sang ${toBranch}...`, 0);

    try {
      for (const item of selectedVehicles) {
        const fromBranch = normalizeBranchName(item.branch);
        if (fromBranch === toBranch) continue;

        await supabase
          .from('Inventory')
          .update({
            branch: toBranch,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        await supabase.from('InventoryLog').insert([
          {
            type: 'transfer',
            brand: item.brand,
            model: item.model,
            color: item.color,
            quantity: 1,
            from_branch: fromBranch,
            to_branch: toBranch,
            note: `Chuyển hàng loạt xe SK: ${item.frame_number} (${note || 'Điều chuyển lô'})`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      const transferredFrames = selectedVehicles.map((v) => v.frame_number).join(', ');
      await logActivity({
        actionType: 'TRANSFER',
        description: `Luân chuyển hàng loạt ${selectedVehicles.length} xe [${transferredFrames}] sang chi nhánh [${toBranch}]`,
        user: currentUser,
      });

      hide();
      message.success(`Đã chuyển thành công ${selectedRowKeys.length} xe sang ${toBranch}!`);
      setIsBatchTransferModalOpen(false);
      batchTransferForm.resetFields();
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi chuyển kho hàng loạt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Chi Nhánh': 'Chi nhánh 1',
        'Hãng Xe': 'Yadea',
        'Model Xe': 'I8',
        'Màu Sắc': 'Trắng Sữa',
        'Số Khung': 'RL9Y5DGMHTFEU1001',
        'Số Acquy': '1008264-100926-001',
        'Ghi Chú': 'Lô xe mới nhập',
      },
      {
        'Chi Nhánh': 'Chi nhánh 2',
        'Hãng Xe': 'Yadea',
        'Model Xe': 'OVA',
        'Màu Sắc': 'Vàng Cam Đất',
        'Số Khung': 'RL9Y5DGMHTFEU1002',
        'Số Acquy': '1008264-100926-002',
        'Ghi Chú': 'Lô xe mới nhập',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [{ wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 15 }, { wch: 24 }, { wch: 24 }, { wch: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauNhapXeSoKhung');
    XLSX.writeFile(workbook, 'Mau_Nhap_Xe_Theo_So_Khung.xlsx');
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rawJson: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

        if (rawJson.length === 0) {
          message.warning('File Excel không có dữ liệu!');
          return;
        }

        const formattedRows: ExcelVehicleRow[] = rawJson
          .map((row: any) => {
            const rawBranch = String(row['Chi Nhánh'] || row['chi_nhanh'] || currentUser.branch).trim();
            const branchName = normalizeBranchName(rawBranch);

            return {
              branch: branchName,
              brand: String(row['Hãng Xe'] || row['hang_xe'] || row['Hãng'] || '').trim(),
              model: String(row['Model Xe'] || row['model_xe'] || row['Model'] || row['Tên Xe'] || '').trim(),
              color: String(row['Màu Sắc'] || row['mau_sac'] || row['Màu'] || 'Tiêu chuẩn').trim(),
              frame_number: String(row['Số Khung'] || row['so_khung'] || row['SK'] || '').trim(),
              battery_number: String(row['Số Acquy'] || row['Số Pin'] || row['so_pin'] || row['so_acquy'] || '').trim(),
              note: String(row['Ghi Chú'] || row['ghi_chu'] || 'Nhập kho Excel').trim(),
            };
          })
          .filter((item) => item.frame_number && item.brand && item.model);

        if (formattedRows.length === 0) {
          message.error('Không tìm thấy cột Số Khung, Hãng Xe, hoặc Model hợp lệ!');
          return;
        }

        setExcelPreviewData(formattedRows);
        setIsExcelModalOpen(true);
      } catch {
        message.error('Định dạng file Excel không hợp lệ!');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleConfirmImportExcel = async () => {
    if (excelPreviewData.length === 0) return;
    setSubmitting(true);
    const hide = message.loading('Đang lưu danh sách xe vào kho...', 0);

    try {
      for (const row of excelPreviewData) {
        const branchName = normalizeBranchName(row.branch);

        const { data: existing } = await supabase
          .from('Inventory')
          .select('id')
          .eq('frame_number', row.frame_number)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('Inventory')
            .update({
              branch: branchName,
              brand: row.brand,
              model: row.model,
              color: row.color,
              battery_number: row.battery_number,
              status: 'in_stock',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('Inventory').insert([
            {
              frame_number: row.frame_number,
              battery_number: row.battery_number,
              branch: branchName,
              brand: row.brand,
              model: row.model,
              color: row.color,
              status: 'in_stock',
            },
          ]);
        }

        await supabase.from('InventoryLog').insert([
          {
            type: 'import',
            brand: row.brand,
            model: row.model,
            color: row.color,
            quantity: 1,
            to_branch: branchName,
            note: `Nhập xe SK: ${row.frame_number} (${row.note})`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      await logActivity({
        actionType: 'IMPORT',
        description: `Nhập kho bằng Excel: Nạp thành công ${excelPreviewData.length} xe vào hệ thống`,
        user: currentUser,
      });

      hide();
      message.success(`Đã nạp thành công ${excelPreviewData.length} xe theo số khung vào kho!`);
      setIsExcelModalOpen(false);
      setExcelPreviewData([]);
      await fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi lưu dữ liệu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportSubmit = async (values: any) => {
    setSubmitting(true);
    const { branch, brand, model, color, frame_number, battery_number, note } = values;
    const targetBranch = normalizeBranchName(branch);

    try {
      const { data: existing } = await supabase
        .from('Inventory')
        .select('id')
        .eq('frame_number', frame_number.trim())
        .maybeSingle();

      if (existing) {
        message.warning(`Số khung [${frame_number}] đã tồn tại trong hệ thống!`);
        setSubmitting(false);
        return;
      }

      await supabase.from('Inventory').insert([
        {
          frame_number: frame_number.trim(),
          battery_number: (battery_number || '').trim(),
          branch: targetBranch,
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          status: 'in_stock',
        },
      ]);

      await supabase.from('InventoryLog').insert([
        {
          type: 'import',
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          quantity: 1,
          to_branch: targetBranch,
          note: `Nhập xe SK: ${frame_number} - ${note || 'Nhập thủ công'}`,
          created_by: currentUser.fullName,
        },
      ]);

      await logActivity({
        actionType: 'IMPORT',
        description: `Nhập xe mới thủ công: [${frame_number}] (${brand} ${model}, màu ${color}) vào chi nhánh [${targetBranch}]`,
        user: currentUser,
      });

      message.success(`Đã thêm xe ${brand} ${model} (SK: ${frame_number}) vào ${targetBranch}!`);
      setIsImportModalOpen(false);
      importForm.resetFields();
      await fetchData();
    } catch (err: any) {
      message.error('Lỗi khi thêm xe: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (values: any) => {
    setSubmitting(true);
    const { frame_number, toBranch, note } = values;
    const targetBranch = normalizeBranchName(toBranch);

    try {
      const { data: item } = await supabase
        .from('Inventory')
        .select('*')
        .eq('frame_number', frame_number)
        .maybeSingle();

      if (!item) {
        message.error('Không tìm thấy xe với số khung này!');
        setSubmitting(false);
        return;
      }

      const fromBranch = normalizeBranchName(item.branch);

      if (fromBranch === targetBranch) {
        message.warning('Chi nhánh nhận phải khác chi nhánh hiện tại của xe!');
        setSubmitting(false);
        return;
      }

      await supabase
        .from('Inventory')
        .update({
          branch: targetBranch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase.from('InventoryLog').insert([
        {
          type: 'transfer',
          brand: item.brand,
          model: item.model,
          color: item.color,
          quantity: 1,
          from_branch: fromBranch,
          to_branch: targetBranch,
          note: `Chuyển xe SK: ${frame_number} (${note || 'Điều tiết kho'})`,
          created_by: currentUser.fullName,
        },
      ]);

      await logActivity({
        actionType: 'TRANSFER',
        description: `Luân chuyển xe [${frame_number}] (${item.brand} ${item.model}) từ [${fromBranch}] sang [${targetBranch}]`,
        user: currentUser,
      });

      message.success(`Đã chuyển xe số khung [${frame_number}] từ ${fromBranch} sang ${targetBranch}!`);
      setIsTransferModalOpen(false);
      transferForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi luân chuyển: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicleList.filter((item) => {
      const itemBranch = normalizeBranchName(item.branch);
      const matchBranch = filterBranch === 'all' ? true : itemBranch === filterBranch;
      const matchStatus = filterStatus === 'all' ? true : item.status === filterStatus;
      const search = searchText.toLowerCase();
      const matchSearch =
        item.frame_number.toLowerCase().includes(search) ||
        (item.battery_number && item.battery_number.toLowerCase().includes(search)) ||
        item.brand.toLowerCase().includes(search) ||
        item.model.toLowerCase().includes(search) ||
        item.color.toLowerCase().includes(search) ||
        itemBranch.toLowerCase().includes(search);
      return matchBranch && matchStatus && matchSearch;
    });
  }, [vehicleList, filterBranch, filterStatus, searchText]);

  const inStockCount = vehicleList.filter((v) => v.status === 'in_stock').length;
  const soldCount = vehicleList.filter((v) => v.status === 'sold').length;

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#e6f7ff', borderColor: '#91caff' }}>
            <Statistic
              title={<span style={{ color: '#0958d9', fontWeight: 600 }}>Xe Đang Tồn Trong Kho</span>}
              value={inStockCount}
              suffix="chiếc"
              prefix={<CarOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title={<span style={{ color: '#389e0d', fontWeight: 600 }}>Tổng Xe Đã Xuất Bán</span>}
              value={soldCount}
              suffix="chiếc"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#fff7e6', borderColor: '#ffd591' }}>
            <Statistic
              title={<span style={{ color: '#d46b08', fontWeight: 600 }}>Chi Nhánh Đang Quản Lý</span>}
              value={2}
              suffix="shop"
              prefix={<ShopOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        type="card"
        items={[
          {
            key: 'stock',
            label: (
              <span>
                <BarcodeOutlined /> Quản Lý Xe Theo Số Khung ({filteredVehicles.length})
              </span>
            ),
            children: (
              <Card size="small" style={{ borderRadius: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <Space wrap>
                    <Select
                      value={filterBranch}
                      onChange={setFilterBranch}
                      style={{ width: 180 }}
                      options={[
                        { label: '🏪 Tất cả chi nhánh', value: 'all' },
                        { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
                        { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
                      ]}
                    />

                    <Select
                      value={filterStatus}
                      onChange={setFilterStatus}
                      style={{ width: 150 }}
                      options={[
                        { label: '📦 Đang tồn kho', value: 'in_stock' },
                        { label: '✅ Đã bán', value: 'sold' },
                        { label: 'Tất cả trạng thái', value: 'all' },
                      ]}
                    />

                    <Input
                      placeholder="Tìm số khung, số pin, hãng, model..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 240 }}
                      allowClear
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                      Tải lại
                    </Button>
                    <Button
                      type="primary"
                      icon={<SyncOutlined spin={syncing} />}
                      style={{ backgroundColor: '#1890ff' }}
                      onClick={() => handleSyncSoldStatus(true)}
                      loading={syncing}
                    >
                      Đồng Bộ Đơn Đã Bán
                    </Button>
                  </Space>

                  <Space wrap>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadSampleExcel}>
                      Tải Mẫu Excel Số Khung
                    </Button>

                    <Upload beforeUpload={handleFileSelect} showUploadList={false} accept=".xlsx, .xls">
                      <Button type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }} icon={<FileExcelOutlined />}>
                        Nhập Lô Xe Bằng Excel
                      </Button>
                    </Upload>

                    <Button
                      type="primary"
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      icon={<PlusOutlined />}
                      onClick={() => {
                        importForm.resetFields();
                        importForm.setFieldsValue({ branch: normalizeBranchName(currentUser.branch) });
                        setIsImportModalOpen(true);
                      }}
                    >
                      Nhập Xe Thủ Công
                    </Button>

                    <Button
                      type="primary"
                      style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                      icon={<SwapOutlined />}
                      onClick={() => {
                        transferForm.resetFields();
                        setIsTransferModalOpen(true);
                      }}
                    >
                      Chuyển 1 Xe Cụ Thể
                    </Button>
                  </Space>
                </div>

                {selectedRowKeys.length > 0 && (
                  <Alert
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    message={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <Space>
                          <CheckSquareOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                          <span>
                            Đã chọn <strong>{selectedRowKeys.length}</strong> xe trong danh sách
                          </span>
                          <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>
                            Bỏ chọn tất cả
                          </Button>
                        </Space>
                        <Space wrap>
                          <Button
                            type="primary"
                            icon={<SwapOutlined />}
                            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                            onClick={() => {
                              batchTransferForm.resetFields();
                              setIsBatchTransferModalOpen(true);
                            }}
                          >
                            Luân Chuyển {selectedRowKeys.length} Xe Đã Chọn
                          </Button>

                          <Popconfirm
                            title="Xác nhận xóa hàng loạt"
                            description={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} xe đã chọn khỏi hệ thống?`}
                            onConfirm={handleBatchDelete}
                            okText="Xóa Tất Cả"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button danger icon={<DeleteOutlined />}>
                              Xóa {selectedRowKeys.length} Xe Đã Chọn
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    }
                    type="info"
                    showIcon={false}
                  />
                )}

                <Table<VehicleStockItem>
                  rowSelection={rowSelection}
                  dataSource={filteredVehicles}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="middle"
                  columns={[
                    {
                      title: 'SỐ KHUNG (VIN)',
                      dataIndex: 'frame_number',
                      key: 'frame_number',
                      render: (sk) => <Text code style={{ color: '#d46b08', fontWeight: 700, fontSize: 13 }}>{sk}</Text>,
                      width: 170,
                    },
                    {
                      title: 'SỐ ACQUY / PIN',
                      dataIndex: 'battery_number',
                      key: 'battery_number',
                      render: (pin) => pin ? <Text type="secondary">{pin}</Text> : <Text type="secondary" italic>--</Text>,
                      width: 160,
                    },
                    {
                      title: 'HÃNG & MODEL XE',
                      key: 'model',
                      render: (_, record) => (
                        <Space direction="vertical" size={0}>
                          <Text strong>{record.brand} {record.model}</Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'MÀU SẮC',
                      dataIndex: 'color',
                      key: 'color',
                      render: (color) => <Tag color="blue">{color}</Tag>,
                      width: 130,
                    },
                    {
                      title: 'VỊ TRÍ CHI NHÁNH',
                      dataIndex: 'branch',
                      key: 'branch',
                      render: (b) => <Tag color="purple">{normalizeBranchName(b)}</Tag>,
                      width: 150,
                    },
                    {
                      title: 'TRẠNG THÁI',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st) => (
                        st === 'in_stock' ? (
                          <Tag color="success">Trong Kho</Tag>
                        ) : st === 'sold' ? (
                          <Tag color="default">Đã Bán</Tag>
                        ) : (
                          <Tag color="warning">Luân Chuyển</Tag>
                        )
                      ),
                      width: 130,
                    },
                    {
                      title: 'NGÀY NHẬP',
                      dataIndex: 'imported_at',
                      key: 'imported_at',
                      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '--',
                      width: 150,
                    },
                    {
                      title: 'THAO TÁC',
                      key: 'action',
                      render: (_, record) => (
                        <Space>
                          <Button
                            size="small"
                            type={record.status === 'in_stock' ? 'default' : 'primary'}
                            onClick={() => handleToggleStatus(record)}
                          >
                            {record.status === 'in_stock' ? 'Đổi: Đã Bán' : 'Đổi: Trong Kho'}
                          </Button>

                          <Popconfirm
                            title="Xác nhận xóa xe"
                            description={`Bạn có chắc chắn muốn xóa xe số khung [${record.frame_number}]?`}
                            onConfirm={() => handleDeleteVehicle(record)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                      width: 170,
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal Nhập xe thủ công */}
      <Modal
        title="Nhập Xe Mới Thủ Công"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onOk={() => importForm.submit()}
        confirmLoading={submitting}
        okText="Lưu Vào Kho"
        cancelText="Hủy"
      >
        <Form form={importForm} layout="vertical" onFinish={handleImportSubmit}>
          <Form.Item name="branch" label="Chi Nhánh" rules={[{ required: true, message: 'Vui lòng chọn chi nhánh!' }]}>
            <Select
              options={[
                { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
                { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
              ]}
            />
          </Form.Item>
          <Form.Item name="brand" label="Hãng Xe" rules={[{ required: true, message: 'Nhập hãng xe!' }]}>
            <Input placeholder="Ví dụ: Yadea, Vinfast, Dkbike..." />
          </Form.Item>
          <Form.Item name="model" label="Model Xe" rules={[{ required: true, message: 'Nhập model xe!' }]}>
            <Input placeholder="Ví dụ: I8, Feliz, Xzone..." />
          </Form.Item>
          <Form.Item name="color" label="Màu Sắc" rules={[{ required: true, message: 'Nhập màu sắc!' }]}>
            <Input placeholder="Ví dụ: Trắng, Đỏ, Xám bóng..." />
          </Form.Item>
          <Form.Item name="frame_number" label="Số Khung (VIN)" rules={[{ required: true, message: 'Nhập số khung!' }]}>
            <Input placeholder="Nhập chính xác số khung xe..." />
          </Form.Item>
          <Form.Item name="battery_number" label="Số Acquy / Pin">
            <Input placeholder="Nhập số seri pin/acquy (nếu có)..." />
          </Form.Item>
          <Form.Item name="note" label="Ghi Chú">
            <Input.TextArea rows={2} placeholder="Ghi chú bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chuyển 1 xe */}
      <Modal
        title="Chuyển 1 Xe Sang Chi Nhánh Khác"
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        onOk={() => transferForm.submit()}
        confirmLoading={submitting}
        okText="Chuyển Kho"
        cancelText="Hủy"
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransferSubmit}>
          <Form.Item name="frame_number" label="Số Khung Xe Cần Chuyển" rules={[{ required: true, message: 'Nhập số khung xe!' }]}>
            <Input placeholder="Nhập số khung xe đang có trong kho..." />
          </Form.Item>
          <Form.Item name="toBranch" label="Chi Nhánh Nhận Xe" rules={[{ required: true, message: 'Chọn chi nhánh đích!' }]}>
            <Select
              options={[
                { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
                { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Lý Do / Ghi Chú">
            <Input.TextArea rows={2} placeholder="Lý do chuyển kho..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chuyển xe hàng loạt */}
      <Modal
        title={`Chuyển Kho Hàng Loạt (${selectedRowKeys.length} Xe)`}
        open={isBatchTransferModalOpen}
        onCancel={() => setIsBatchTransferModalOpen(false)}
        onOk={() => batchTransferForm.submit()}
        confirmLoading={submitting}
        okText="Xác Nhận Chuyển Tất Cả"
        cancelText="Hủy"
      >
        <Form form={batchTransferForm} layout="vertical" onFinish={handleBatchTransferSubmit}>
          <Form.Item name="toBranch" label="Chi Nhánh Đích Nhận Xe" rules={[{ required: true, message: 'Vui lòng chọn chi nhánh đích!' }]}>
            <Select
              options={[
                { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
                { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi Chú Luân Chuyển">
            <Input.TextArea rows={2} placeholder="Nhập ghi chú cho đợt chuyển lô này..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Xem trước file Excel */}
      <Modal
        title={`Xác Nhận Nhập Lô Xe Tồn Kho Từ Excel (${excelPreviewData.length} chiếc)`}
        open={isExcelModalOpen}
        onCancel={() => setIsExcelModalOpen(false)}
        onOk={handleConfirmImportExcel}
        confirmLoading={submitting}
        okText="Xác Nhận Nạp Kho"
        cancelText="Hủy"
        width={900}
      >
        <Table<ExcelVehicleRow>
          dataSource={excelPreviewData}
          rowKey={(r) => r.frame_number}
          pagination={{ pageSize: 5 }}
          size="small"
          columns={[
            { title: 'Số Khung', dataIndex: 'frame_number', key: 'frame_number' },
            { title: 'Số Acquy / Pin', dataIndex: 'battery_number', key: 'battery_number' },
            { title: 'Hãng', dataIndex: 'brand', key: 'brand' },
            { title: 'Model', dataIndex: 'model', key: 'model' },
            { title: 'Màu', dataIndex: 'color', key: 'color' },
            { title: 'Chi Nhánh', dataIndex: 'branch', key: 'branch', render: (b) => <Tag color="purple">{normalizeBranchName(b)}</Tag> },
            { title: 'Ghi Chú', dataIndex: 'note', key: 'note' },
          ]}
        />
      </Modal>
    </div>
  );
};