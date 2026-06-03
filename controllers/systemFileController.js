import mongoose from 'mongoose';

import SystemFile from '../models/SystemFile.js';

import { isDatabaseReady } from '../middleware/requireDb.js';



const BADGE_TYPES = ['FREE', 'VIP', 'PRO', 'NONE'];



function getCategory(req) {

  return req.fileCategory === 'cheathack' ? 'cheathack' : 'system';

}



function isPortalPublicList(req) {

  return String(req.originalUrl || '').includes('/integration/');

}



function portalCategoryFromUrl(req) {

  if (String(req.originalUrl || '').includes('cheathack-files')) {

    return 'cheathack';

  }

  return 'system';

}



/** Client Portal — chỉ dữ liệu thật theo danh mục */

export async function listSystemFilesPortal(req, res) {

  const category = portalCategoryFromUrl(req);

  if (!isDatabaseReady()) {

    return res.status(200).json({ success: true, files: [] });

  }

  try {

    const files = await SystemFile.find({ category })

      .sort({ createdAt: -1 })

      .lean();

    return res.status(200).json({

      success: true,

      files: Array.isArray(files) ? files : [],

    });

  } catch (err) {

    console.error('[systemFileController.listSystemFilesPortal]', err);

    return res.status(200).json({ success: true, files: [] });

  }

}



export async function listSystemFiles(req, res) {

  if (isPortalPublicList(req)) {

    return listSystemFilesPortal(req, res);

  }



  const category = getCategory(req);



  if (!isDatabaseReady()) {

    return res.status(200).json({

      success: true,

      files: [],

      message: 'Database đang kết nối — vui lòng F5 sau vài giây',

    });

  }



  try {

    const files = await SystemFile.find({ category })

      .sort({ createdAt: -1 })

      .lean();

    return res.status(200).json({

      success: true,

      files: Array.isArray(files) ? files : [],

    });

  } catch (err) {

    console.error('[systemFileController.listSystemFiles]', err);

    res.status(200).json({

      success: true,

      files: [],

      message: 'Lỗi tải danh sách file',

    });

  }

}



export async function createSystemFile(req, res) {

  if (!isDatabaseReady()) {

    return res.status(503).json({

      success: false,

      message: 'Database chưa sẵn sàng — đợi vài giây rồi thử lại',

    });

  }

  try {

    const { fileName, description, badgeType, uploadDate, downloadLink } = req.body;

    const category = getCategory(req);



    if (!fileName?.trim() || !uploadDate?.trim() || !downloadLink?.trim()) {

      return res.status(400).json({

        success: false,

        message: 'Thiếu tên file, ngày upload hoặc link tải',

      });

    }



    const badge = String(badgeType || 'NONE').toUpperCase();

    if (!BADGE_TYPES.includes(badge)) {

      return res.status(400).json({

        success: false,

        message: 'badgeType phải là FREE, VIP, PRO hoặc NONE',

      });

    }



    const file = await SystemFile.create({

      fileName: fileName.trim(),

      description: String(description ?? '').trim(),

      badgeType: badge,

      uploadDate: uploadDate.trim(),

      downloadLink: downloadLink.trim(),

      category,

    });



    res.status(201).json({

      success: true,

      message: 'Đã thêm file thành công!',

      file,

    });

  } catch (err) {

    console.error('[systemFileController.createSystemFile]', err);

    res.status(500).json({ success: false, message: 'Lỗi thêm file' });

  }

}



export async function deleteSystemFilePost(req, res) {

  req.params.id = req.body?.id || req.body?.fileId || req.params.id;

  return deleteSystemFile(req, res);

}



export async function deleteSystemFile(req, res) {

  const { id } = req.params;

  const category = getCategory(req);



  if (

    String(id).startsWith('demo-mock') ||

    String(id).startsWith('mock-')

  ) {

    return res.json({ success: true, message: 'Đã ẩn dòng mẫu' });

  }

  if (!isDatabaseReady()) {

    return res.status(503).json({

      success: false,

      message: 'Database chưa sẵn sàng',

    });

  }

  try {

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({ success: false, message: 'ID file không hợp lệ' });

    }

    const file = await SystemFile.findOneAndDelete({ _id: id, category });

    if (!file) {

      return res.status(404).json({ success: false, message: 'Không tìm thấy file' });

    }

    res.json({ success: true, message: 'Đã xóa file thành công!' });

  } catch (err) {

    console.error('[systemFileController.deleteSystemFile]', err);

    res.status(500).json({ success: false, message: 'Lỗi xóa file' });

  }

}



export async function updateSystemFile(req, res) {

  if (!isDatabaseReady()) {

    return res.status(503).json({

      success: false,

      message: 'Database chưa sẵn sàng',

    });

  }

  const category = getCategory(req);

  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {

      return res.status(400).json({ success: false, message: 'ID file không hợp lệ' });

    }

    const file = await SystemFile.findOne({ _id: req.params.id, category });

    if (!file) {

      return res.status(404).json({ success: false, message: 'Không tìm thấy file' });

    }



    const { fileName, description, badgeType, uploadDate, downloadLink } = req.body;

    if (fileName != null) file.fileName = String(fileName).trim();

    if (description != null) file.description = String(description).trim();

    if (uploadDate != null) file.uploadDate = String(uploadDate).trim();

    if (downloadLink != null) file.downloadLink = String(downloadLink).trim();

    if (badgeType != null) {

      const badge = String(badgeType).toUpperCase();

      if (!BADGE_TYPES.includes(badge)) {

        return res.status(400).json({ success: false, message: 'badgeType không hợp lệ' });

      }

      file.badgeType = badge;

    }



    await file.save();

    res.json({ success: true, message: 'Đã lưu thay đổi!', file });

  } catch (err) {

    console.error('[systemFileController.updateSystemFile]', err);

    res.status(500).json({ success: false, message: 'Lỗi cập nhật file' });

  }

}


