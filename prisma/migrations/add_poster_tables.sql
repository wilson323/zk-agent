-- 海报风格表
CREATE TABLE poster_styles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  preview_url VARCHAR(500),
  category VARCHAR(50) NOT NULL,
  tags TEXT[], -- PostgreSQL数组类型
  industry_specific TEXT[],
  parameters JSONB,
  is_active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 海报模板表
CREATE TABLE poster_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  category VARCHAR(50) NOT NULL,
  industry VARCHAR(50) NOT NULL,
  product_type VARCHAR(50),
  use_case VARCHAR(50),
  popularity INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  is_new BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模板元素表
CREATE TABLE template_elements (
  id VARCHAR(50) PRIMARY KEY,
  template_id VARCHAR(50) REFERENCES poster_templates(id) ON DELETE CASCADE,
  element_type VARCHAR(50) NOT NULL,
  position JSONB NOT NULL,
  size JSONB NOT NULL,
  properties JSONB,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模板标签表
CREATE TABLE template_tags (
  id SERIAL PRIMARY KEY,
  template_id VARCHAR(50) REFERENCES poster_templates(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 配色方案表
CREATE TABLE color_palettes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  colors TEXT[] NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  industry_recommended TEXT[],
  is_active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 海报尺寸表
CREATE TABLE poster_sizes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  dimensions VARCHAR(50) NOT NULL,
  ratio VARCHAR(20) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  dpi INTEGER,
  category VARCHAR(50) NOT NULL,
  recommended BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 海报生成历史表
CREATE TABLE poster_generations (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  prompt TEXT NOT NULL,
  style VARCHAR(50),
  template_id VARCHAR(50) REFERENCES poster_templates(id),
  settings JSONB,
  image_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  industry VARCHAR(50),
  generation_time INTEGER, -- 毫秒
  model_version VARCHAR(50),
  seed INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 行业配置表
CREATE TABLE industry_configs (
  industry VARCHAR(50) PRIMARY KEY,
  brand_colors TEXT[],
  typography JSONB,
  layout_preferences JSONB,
  content_guidelines JSONB,
  compliance_requirements TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入安防行业基础数据
INSERT INTO poster_styles (id, name, description, preview_url, category, tags, industry_specific) VALUES
('security_professional', '安防专业', '专业可靠的安防产品展示风格', '/styles/security_professional.jpg', 'security', ARRAY['专业', '可靠', '技术'], ARRAY['security']),
('security_modern', '现代安防', '现代简约的安防解决方案风格', '/styles/security_modern.jpg', 'security', ARRAY['现代', '简约', '科技'], ARRAY['security']),
('security_enterprise', '企业安防', '面向企业客户的专业安防风格', '/styles/security_enterprise.jpg', 'security', ARRAY['企业', '专业', '高端'], ARRAY['security']);

INSERT INTO color_palettes (id, name, colors, description, category, industry_recommended) VALUES
('security_blue', '安防蓝', ARRAY['#1E40AF', '#3B82F6', '#60A5FA'], '专业可信的蓝色系', 'security', ARRAY['security']),
('security_dark', '安防黑', ARRAY['#1F2937', '#374151', '#6B7280'], '稳重专业的黑灰系', 'security', ARRAY['security']),
('security_green', '安防绿', ARRAY['#059669', '#10B981', '#34D399'], '安全可靠的绿色系', 'security', ARRAY['security']);

INSERT INTO poster_sizes (id, name, dimensions, ratio, width, height, category, recommended) VALUES
('security_brochure', '安防宣传册', '210×297mm', '3:4', 2480, 3508, 'print', true),
('security_banner', '安防横幅', '1200×400px', '3:1', 1200, 400, 'digital', true),
('security_poster', '安防海报', '600×800px', '3:4', 600, 800, 'print', true);

-- 插入安防模板数据
INSERT INTO poster_templates (id, name, description, thumbnail_url, category, industry, product_type, use_case, popularity, is_new, is_premium) VALUES
('sec_cam_residential', '家用监控摄像头', '适用于家庭安防的监控摄像头宣传模板', '/templates/sec_cam_residential.jpg', 'product', 'security', 'surveillance_camera', 'residential', 95, true, false),
('sec_access_commercial', '商用门禁系统', '商业场所门禁控制系统宣传模板', '/templates/sec_access_commercial.jpg', 'solution', 'security', 'access_control', 'commercial', 88, false, true),
('sec_alarm_industrial', '工业报警系统', '工业环境安全报警系统宣传模板', '/templates/sec_alarm_industrial.jpg', 'solution', 'security', 'alarm_system', 'industrial', 82, false, true);

-- 创建索引
CREATE INDEX idx_poster_templates_industry ON poster_templates(industry);
CREATE INDEX idx_poster_templates_product_type ON poster_templates(product_type);
CREATE INDEX idx_poster_templates_popularity ON poster_templates(popularity DESC);
CREATE INDEX idx_poster_generations_user_id ON poster_generations(user_id);
CREATE INDEX idx_poster_generations_created_at ON poster_generations(created_at DESC);
