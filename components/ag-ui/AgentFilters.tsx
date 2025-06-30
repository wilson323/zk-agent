interface AgentFiltersProps {
  filters: {
    type?: AgentType;
    status?: AgentStatus;
    tags?: string;
    isPublic?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  onChange: (filters: Partial<AgentFiltersProps['filters']>) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  className?: string;
}

// 智能体类型配置
const AGENT_TYPES = [
  { value: AgentType.CHAT, label: '对话助手', icon: MessageCircleIcon },
  { value: AgentType.CAD_ANALYZER, label: 'CAD分析', icon: ActivityIcon },
  { value: AgentType.POSTER_GENERATOR, label: '海报生成', icon: TrendingUpIcon },
  { value: AgentType.CUSTOM, label: '自定义', icon: UsersIcon },
];

// 状态配置
const AGENT_STATUSES = [
  { value: AgentStatus.ACTIVE, label: '运行中', color: 'bg-green-500' },
  { value: AgentStatus.INACTIVE, label: '离线', color: 'bg-gray-500' },
  { value: AgentStatus.MAINTENANCE, label: '维护中', color: 'bg-yellow-500' },
];

// 排序选项
const SORT_OPTIONS = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'name', label: '名称' },
  { value: 'rating', label: '评分' },
  { value: 'totalRequests', label: '使用量' },
];

// 热门标签（实际项目中应该从API获取）
const POPULAR_TAGS = [
  '智能对话', 'CAD设计', '图像生成', '数据分析', 
  '代码助手', '翻译', '写作', '客服', '教育', '医疗'
];

export function AgentFilters({
  filters,
  onChange,
  onSortChange,
  className = ''
}: AgentFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    filters.tags ? filters.tags.split(',') : []
  );

  // 获取当前活跃的筛选器数量
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.type) {count++;}
    if (filters.status) {count++;}
    if (filters.tags) {count++;}
    if (filters.isPublic !== undefined) {count++;}
    return count;
  };

  // 处理类型筛选
  const handleTypeChange = (type: string) => {
    onChange({ 
      type: type === 'all' ? undefined : type as AgentType 
    });
  };

  // 处理状态筛选
  const handleStatusChange = (status: string) => {
    onChange({ 
      status: status === 'all' ? undefined : status as AgentStatus 
    });
  };

  // 处理标签筛选
  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    onChange({ 
      tags: newTags.length > 0 ? newTags.join(',') : undefined 
    });
  };

  // 处理公开性筛选
  const handlePublicChange = (isPublic: string) => {
    onChange({ 
      isPublic: isPublic === 'all' ? undefined : isPublic === 'true' 
    });
  };

  // 清除所有筛选器
  const clearAllFilters = () => {
    setSelectedTags([]);
    onChange({
      type: undefined,
      status: undefined,
      tags: undefined,
      isPublic: undefined
    });
  };

  // 处理排序变更
  const handleSortChange = (sortBy: string) => {
    onSortChange(sortBy, filters.sortOrder || 'desc');
  };

  // 切换排序方向
  const toggleSortOrder = () => {
    const newOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(filters.sortBy || 'createdAt', newOrder);
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 筛选器按钮 */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <FilterIcon className="h-4 w-4 mr-2" />
            筛选
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            {/* 筛选器标题 */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium">筛选条件</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs h-auto p-1"
                >
                  清除全部
                </Button>
              )}
            </div>

            {/* 智能体类型 */}
            <div>
              <label className="text-sm font-medium mb-2 block">类型</label>
              <Select 
                value={filters.type || 'all'} 
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {AGENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 状态 */}
            <div>
              <label className="text-sm font-medium mb-2 block">状态</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {AGENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 可见性 */}
            <div>
              <label className="text-sm font-medium mb-2 block">可见性</label>
              <Select 
                value={filters.isPublic === undefined ? 'all' : filters.isPublic.toString()} 
                onValueChange={handlePublicChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择可见性" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="true">公开</SelectItem>
                  <SelectItem value="false">私有</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 标签筛选 */}
            <div>
              <label className="text-sm font-medium mb-2 block">标签</label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <label
                      htmlFor={tag}
                      className="text-sm cursor-pointer hover:text-primary"
                    >
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 排序控制 */}
      <div className="flex items-center gap-1">
        <Select 
          value={filters.sortBy || 'createdAt'} 
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleSortOrder}
          className="px-2"
        >
          {filters.sortOrder === 'asc' ? (
            <SortAscIcon className="h-4 w-4" />
          ) : (
            <SortDescIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 已选择的筛选器标签 */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1 ml-2">
          {filters.type && (
            <Badge variant="secondary" className="text-xs">
              {AGENT_TYPES.find(t => t.value === filters.type)?.label}
              <XIcon 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleTypeChange('all')}
              />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="text-xs">
              {AGENT_STATUSES.find(s => s.value === filters.status)?.label}
              <XIcon 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => handleStatusChange('all')}
              />
            </Badge>
          )}
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedTags.length}个标签
              <XIcon 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => {
                  setSelectedTags([]);
                  onChange({ tags: undefined });
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
} 