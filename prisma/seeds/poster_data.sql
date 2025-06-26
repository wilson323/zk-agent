-- 插入海报风格数据
INSERT INTO "poster_styles" (id, name, description, category, "previewUrl", "order") VALUES
('style_modern', '现代简约', '简洁线条，几何元素，现代感强', 'business', '/placeholder.svg?height=100&width=100&text=Modern', 1),
('style_vintage', '复古风格', '怀旧色调，经典排版，复古韵味', 'artistic', '/placeholder.svg?height=100&width=100&text=Vintage', 2),
('style_minimalist', '极简主义', '留白设计，纯净美学，简约至上', 'business', '/placeholder.svg?height=100&width=100&text=Minimal', 3),
('style_tech', '科技未来', '渐变光效，数字感，科技风格', 'tech', '/placeholder.svg?height=100&width=100&text=Tech', 4),
('style_security', '安防专业', '专业可靠，安全感强，行业特色', 'security', '/placeholder.svg?height=100&width=100&text=Security', 5),
('style_nature', '自然清新', '绿色生态，有机形状，自然风格', 'lifestyle', '/placeholder.svg?height=100&width=100&text=Nature', 6);

-- 插入海报尺寸数据
INSERT INTO "poster_sizes" (id, name, dimensions, ratio, width, height, dpi, category, "order") VALUES
('size_a4', 'A4 海报', '210×297mm', '3:4', 2480, 3508, 300, 'print', 1),
('size_a3', 'A3 海报', '297×420mm', '3:4', 3508, 4961, 300, 'print', 2),
('size_square', '正方形', '1080×1080px', '1:1', 1080, 1080, 72, 'social', 3),
('size_story', '故事版', '1080×1920px', '9:16', 1080, 1920, 72, 'social', 4),
('size_banner', '横幅', '1920×1080px', '16:9', 1920, 1080, 72, 'digital', 5),
('size_poster', '标准海报', '600×800px', '3:4', 600, 800, 72, 'digital', 6);

-- 插入配色方案数据
INSERT INTO "color_palettes" (id, name, colors, description, category, "order") VALUES
('palette_brand', '品牌色', ARRAY['#6CB33F', '#8ED658', '#A8E6A3'], '品牌主色调，绿色系', 'brand', 1),
('palette_security', '安防专业', ARRAY['#2C3E50', '#3498DB', '#E74C3C'], '专业安防色调', 'security', 2),
('palette_warm', '暖色调', ARRAY['#FF6B6B', '#FFE66D', '#FF8E53'], '温暖活力色调', 'warm', 3),
('palette_cool', '冷色调', ARRAY['#4ECDC4', '#45B7D1', '#96CEB4'], '清新冷静色调', 'cool', 4),
('palette_monochrome', '单色调', ARRAY['#2C3E50', '#34495E', '#7F8C8D'], '经典黑白灰', 'neutral', 5),
('palette_vibrant', '鲜艳色彩', ARRAY['#E74C3C', '#F39C12', '#9B59B6'], '活力四射色调', 'vibrant', 6);

-- 插入安防行业模板数据
INSERT INTO "poster_templates" (id, name, description, "thumbnailUrl", category, industry, "productType", "useCase", elements, popularity, "isNew") VALUES
('template_camera_home', '家用监控摄像头', '适用于家庭安防监控产品宣传', '/placeholder.svg?height=200&width=150&text=Camera', 'product', 'security', 'surveillance_camera', 'residential', '{"layout": "product_showcase", "elements": ["hero_image", "product_specs", "features", "cta"]}', 95, true),
('template_access_control', '门禁系统解决方案', '商用门禁系统专业展示', '/placeholder.svg?height=200&width=150&text=Access', 'solution', 'security', 'access_control', 'commercial', '{"layout": "solution_overview", "elements": ["system_diagram", "benefits", "case_study", "contact"]}', 88, false),
('template_alarm_system', '智能报警系统', '全方位安防报警解决方案', '/placeholder.svg?height=200&width=150&text=Alarm', 'system', 'security', 'alarm_system', 'commercial', '{"layout": "system_features", "elements": ["feature_grid", "technology", "certification", "support"]}', 92, true),
('template_smart_lock', '智能门锁产品', '智能门锁产品特色展示', '/placeholder.svg?height=200&width=150&text=Lock', 'product', 'security', 'smart_lock', 'residential', '{"layout": "product_detail", "elements": ["product_image", "key_features", "specifications", "warranty"]}', 85, false);

-- 插入模板标签数据
INSERT INTO "poster_template_tags" ("templateId", name) VALUES
('template_camera_home', '家用'),
('template_camera_home', '监控'),
('template_camera_home', '高清'),
('template_camera_home', '夜视'),
('template_access_control', '门禁'),
('template_access_control', '刷卡'),
('template_access_control', '指纹'),
('template_access_control', '人脸识别'),
('template_alarm_system', '报警'),
('template_alarm_system', '防盗'),
('template_alarm_system', '智能'),
('template_alarm_system', '联网'),
('template_smart_lock', '智能锁'),
('template_smart_lock', '密码'),
('template_smart_lock', '指纹'),
('template_smart_lock', '远程');
