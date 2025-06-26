-- CreateTable
CREATE TABLE "poster_styles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "previewUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poster_styles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_sizes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL,
    "ratio" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "dpi" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poster_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color_palettes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colors" TEXT[],
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "color_palettes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "industry" TEXT,
    "productType" TEXT,
    "useCase" TEXT,
    "elements" JSONB NOT NULL,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poster_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_template_tags" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "poster_template_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "palette" TEXT NOT NULL,
    "referenceImageUrl" TEXT,
    "resultImageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poster_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_generations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "palette" TEXT NOT NULL,
    "templateId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "settings" JSONB NOT NULL,
    "metadata" JSONB,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poster_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "poster_template_tags_templateId_name_key" ON "poster_template_tags"("templateId", "name");

-- AddForeignKey
ALTER TABLE "poster_template_tags" ADD CONSTRAINT "poster_template_tags_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "poster_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_tasks" ADD CONSTRAINT "poster_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_tasks" ADD CONSTRAINT "poster_tasks_style_fkey" FOREIGN KEY ("style") REFERENCES "poster_styles"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_tasks" ADD CONSTRAINT "poster_tasks_size_fkey" FOREIGN KEY ("size") REFERENCES "poster_sizes"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_tasks" ADD CONSTRAINT "poster_tasks_palette_fkey" FOREIGN KEY ("palette") REFERENCES "color_palettes"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_tasks" ADD CONSTRAINT "poster_tasks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "poster_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_generations" ADD CONSTRAINT "poster_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_generations" ADD CONSTRAINT "poster_generations_style_fkey" FOREIGN KEY ("style") REFERENCES "poster_styles"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_generations" ADD CONSTRAINT "poster_generations_size_fkey" FOREIGN KEY ("size") REFERENCES "poster_sizes"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_generations" ADD CONSTRAINT "poster_generations_palette_fkey" FOREIGN KEY ("palette") REFERENCES "color_palettes"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_generations" ADD CONSTRAINT "poster_generations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "poster_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
