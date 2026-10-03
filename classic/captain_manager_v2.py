import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os
import pyperclip

class CaptainAddressManager:
    def __init__(self, root):
        self.root = root
        self.root.title("舰长收货地址管理工具")
        self.root.geometry("1200x800")

        # 状态符号定义和颜色映射
        self.symbols = {
            "!": {"name": "无需", "color": "#9E9E9E"},      # 灰色
            "@": {"name": "已询问", "color": "#2196F3"}, # 蓝色
            "#": {"name": "已询问", "color": "#2196F3"}, # 蓝色
            "*": {"name": "无法联系", "color": "#F44336"}, # 红色
            "^": {"name": "待询问", "color": "#FF9800"},  # 橙色
            "&": {"name": "小号", "color": "#9C27B0"},    # 紫色
            "-": {"name": "特殊情况", "color": "#607D8B"},# 蓝灰色 (新增)
            "~": {"name": "主播", "color": "#E91E63"},    # 粉色 (新增)
            " ": {"name": "已填写", "color": "#4CAF50"}   # 绿色
        }

        # 数据存储
        self.captains = []
        self.current_file = None
        self.current_filter = "全部"  # 当前筛选状态
        self.hide_recipient = False # 是否隐藏收件人

        # 创建GUI界面
        self.create_widgets()

    def create_widgets(self):
        # 创建菜单栏
        self.create_menu()

        # 顶部框架
        top_frame = tk.Frame(self.root)
        top_frame.pack(pady=5, padx=10, fill=tk.X)

        # 左侧按钮组
        left_btn_frame = tk.Frame(top_frame)
        left_btn_frame.pack(side=tk.LEFT, fill=tk.Y)
        tk.Button(left_btn_frame, text="📂 读取已归类文档", command=self.load_sorted_file, bg="#4CAF50", fg="white", width=18).pack(side=tk.TOP, padx=2, pady=2)
        tk.Button(left_btn_frame, text="📄 读取未归类名单", command=self.load_unsorted_file, bg="#2196F3", fg="white", width=18).pack(side=tk.TOP, padx=2, pady=2)
        tk.Button(left_btn_frame, text="💾 保存文档", command=self.save_file, bg="#FF9800", fg="white", width=18).pack(side=tk.TOP, padx=2, pady=2)
        tk.Button(left_btn_frame, text="📋 复制已填写地址", command=self.copy_filled_addresses, bg="#9C27B0", fg="white", width=18).pack(side=tk.TOP, padx=2, pady=2)
        # 新增导出按钮
        tk.Button(left_btn_frame, text="📤 导出已填写地址", command=self.export_filled_addresses, bg="#009688", fg="white", width=18).pack(side=tk.TOP, padx=2, pady=2)

        # 右侧状态筛选和统计
        right_frame = tk.Frame(top_frame)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=10)

        # 状态筛选器
        tk.Label(right_frame, text="筛选状态:", font=("Arial", 9)).pack(anchor=tk.W)
        self.filter_var = tk.StringVar(value="全部")
        filter_combo = ttk.Combobox(right_frame, textvariable=self.filter_var, values=["全部", "已填写", "待询问", "已询问(QQ)", "已询问(B站)", "无法联系", "小号", "无需", "特殊情况", "主播"], width=15, state="readonly")
        filter_combo.pack(anchor=tk.W, pady=(0, 5))
        filter_combo.bind('<<ComboboxSelected>>', self.on_filter_changed)

        # 统计信息框架
        stats_frame = tk.LabelFrame(right_frame, text="统计信息", padx=10, pady=5)
        stats_frame.pack(fill=tk.X, pady=5)
        self.total_label = tk.Label(stats_frame, text="总人数: 0", font=("Arial", 9))
        self.total_label.pack(anchor=tk.W)
        self.filled_label = tk.Label(stats_frame, text="已填写: 0", fg="#4CAF50", font=("Arial", 9, "bold"))
        self.filled_label.pack(anchor=tk.W)
        self.unfilled_label = tk.Label(stats_frame, text="未填写: 0", fg="#F44336", font=("Arial", 9, "bold"))
        self.unfilled_label.pack(anchor=tk.W)

        # 状态符号说明
        symbol_frame = tk.LabelFrame(right_frame, text="状态符号说明", padx=10, pady=5)
        symbol_frame.pack(fill=tk.X, pady=5)
        for symbol, info in self.symbols.items():
            if symbol == " ":
                continue
            frame = tk.Frame(symbol_frame)
            frame.pack(anchor=tk.W, pady=1)
            tk.Label(frame, text=f"{symbol} {info['name']}", fg="white", bg=info['color'], font=("Arial", 8), width=14, anchor="w").pack(side=tk.LEFT)

        # 主内容框架
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # 左侧列表框架
        list_frame = tk.Frame(main_frame)
        list_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # 已填写列表
        filled_header = tk.Frame(list_frame)
        filled_header.pack(fill=tk.X, pady=(0, 5))
        tk.Label(filled_header, text="✅ 已填写舰长", font=("Arial", 10, "bold"), fg="#4CAF50").pack(side=tk.LEFT)
        tk.Label(filled_header, text="(自动取消标记)", font=("Arial", 9), fg="#757575").pack(side=tk.LEFT, padx=(5, 0))
        
        # 新增隐藏收件人复选框
        self.hide_var = tk.BooleanVar(value=False)
        tk.Checkbutton(filled_header, text="隐藏收件人", variable=self.hide_var, command=self.toggle_hide_recipient).pack(side=tk.RIGHT)

        self.filled_tree = ttk.Treeview(filled_header, columns=("昵称", "收件人"), show="headings", height=12)
        self.filled_tree.pack(fill=tk.BOTH, expand=True)
        # 设置列
        self.filled_tree.heading("昵称", text="昵称 (B站用户名)")
        self.filled_tree.heading("收件人", text="收件人名字")
        self.filled_tree.column("昵称", width=200)
        self.filled_tree.column("收件人", width=150)
        self.filled_tree.bind('<<TreeviewSelect>>', self.on_filled_select)

        # 未填写列表 - 使用Treeview代替Listbox
        tk.Label(list_frame, text="⏳ 未填写舰长", font=("Arial", 10, "bold"), fg="#FF9800").pack(anchor=tk.W, pady=(10, 5))
        self.unfilled_tree = ttk.Treeview(list_frame, columns=("状态", "昵称"), show="headings", height=12)
        self.unfilled_tree.pack(fill=tk.BOTH, expand=True)
        # 设置列
        self.unfilled_tree.heading("状态", text="状态")
        self.unfilled_tree.heading("昵称", text="昵称 (B站用户名)")
        self.unfilled_tree.column("状态", width=80)
        self.unfilled_tree.column("昵称", width=270)
        self.unfilled_tree.bind('<<TreeviewSelect>>', self.on_unfilled_select)

        # 为Treeview设置tag用于颜色
        for symbol, info in self.symbols.items():
            if symbol != " ":  # 已填写状态不在未填写列表中显示
                self.unfilled_tree.tag_configure(symbol, foreground=info['color'])

        # 右侧编辑框架
        edit_frame = tk.Frame(main_frame, width=450, relief=tk.RIDGE, borderwidth=2)
        edit_frame.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(10, 0))
        edit_frame.pack_propagate(False)
        tk.Label(edit_frame, text="✏️ 编辑舰长信息", font=("Arial", 12, "bold"), bg="#E0E0E0").pack(fill=tk.X, pady=(0, 10))

        # 编辑表单
        form_frame = tk.Frame(edit_frame)
        form_frame.pack(fill=tk.BOTH, expand=True, padx=20)

        # 状态标记
        tk.Label(form_frame, text="状态标记:", font=("Arial", 10)).grid(row=0, column=0, sticky=tk.W, pady=8)
        self.status_var = tk.StringVar()
        status_combo = ttk.Combobox(form_frame, textvariable=self.status_var, values=list(self.symbols.keys()), width=12)
        status_combo.grid(row=0, column=1, sticky=tk.W, pady=8)

        # 昵称
        tk.Label(form_frame, text="昵称 (B站用户名):", font=("Arial", 10)).grid(row=1, column=0, sticky=tk.W, pady=8)
        self.nickname_var = tk.StringVar()
        tk.Entry(form_frame, textvariable=self.nickname_var, width=35, font=("Arial", 10)).grid(row=1, column=1, sticky=tk.W, pady=8)

        # 收件人名字
        tk.Label(form_frame, text="收件人名字:", font=("Arial", 10)).grid(row=2, column=0, sticky=tk.W, pady=8)
        self.recipient_var = tk.StringVar()
        tk.Entry(form_frame, textvariable=self.recipient_var, width=35, font=("Arial", 10)).grid(row=2, column=1, sticky=tk.W, pady=8)

        # 手机号
        tk.Label(form_frame, text="手机号:", font=("Arial", 10)).grid(row=3, column=0, sticky=tk.W, pady=8)
        self.phone_var = tk.StringVar()
        tk.Entry(form_frame, textvariable=self.phone_var, width=35, font=("Arial", 10)).grid(row=3, column=1, sticky=tk.W, pady=8)

        # 地址
        tk.Label(form_frame, text="地址:", font=("Arial", 10)).grid(row=4, column=0, sticky=tk.NW, pady=8)
        self.address_text = scrolledtext.ScrolledText(form_frame, height=4, width=35, font=("Arial", 10))
        self.address_text.grid(row=4, column=1, sticky=tk.W, pady=8)

        # 信息填写状态指示器 (用于校验警告)
        self.status_indicator = tk.Label(form_frame, text="", font=("Arial", 9), wraplength=250, justify=tk.LEFT)
        self.status_indicator.grid(row=5, column=1, sticky=tk.W, pady=5)

        # 保存和删除按钮
        btn_subframe = tk.Frame(edit_frame)
        btn_subframe.pack(fill=tk.X, pady=20, padx=20)
        tk.Button(btn_subframe, text="💾 保存修改", command=self.save_changes, bg="#4CAF50", fg="white", font=("Arial", 10), width=15).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_subframe, text="🗑️ 删除当前", command=self.delete_current, bg="#F44336", fg="white", font=("Arial", 10), width=15).pack(side=tk.LEFT, padx=5)

        # 快速操作按钮
        quick_btn_frame = tk.Frame(edit_frame)
        quick_btn_frame.pack(fill=tk.X, pady=(0, 20), padx=20)
        tk.Button(quick_btn_frame, text="📞 已询问(QQ)", command=lambda: self.set_status("@"), bg="#2196F3", fg="white", font=("Arial", 9)).pack(side=tk.LEFT, padx=2)
        tk.Button(quick_btn_frame, text="💬 已询问(B站)", command=lambda: self.set_status("#"), bg="#2196F3", fg="white", font=("Arial", 9)).pack(side=tk.LEFT, padx=2)
        tk.Button(quick_btn_frame, text="⏳ 待询问", command=lambda: self.set_status("^"), bg="#FF9800", fg="white", font=("Arial", 9)).pack(side=tk.LEFT, padx=2)

        # 状态栏
        self.status_bar = tk.Label(self.root, text="就绪", bd=1, relief=tk.SUNKEN, anchor=tk.W, font=("Arial", 9))
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def create_menu(self):
        menubar = tk.Menu(self.root)
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="打开已归类文档", command=self.load_sorted_file)
        file_menu.add_command(label="打开未归类名单", command=self.load_unsorted_file)
        file_menu.add_separator()
        file_menu.add_command(label="保存", command=self.save_file)
        file_menu.add_command(label="另存为...", command=self.save_as_file)
        file_menu.add_separator()
        file_menu.add_command(label="退出", command=self.root.quit)
        menubar.add_cascade(label="文件", menu=file_menu)

        edit_menu = tk.Menu(menubar, tearoff=0)
        edit_menu.add_command(label="复制已填写地址", command=self.copy_filled_addresses)
        edit_menu.add_command(label="导出已填写地址", command=self.export_filled_addresses) # 新增
        edit_menu.add_separator()
        edit_menu.add_command(label="标记全部为已询问", command=self.mark_all_asked)
        edit_menu.add_command(label="标记全部为待询问", command=self.mark_all_pending) # 新增
        menubar.add_cascade(label="编辑", menu=edit_menu)

        view_menu = tk.Menu(menubar, tearoff=0)
        view_menu.add_command(label="显示全部", command=lambda: self.filter_captains("全部"))
        view_menu.add_command(label="只显示已填写", command=lambda: self.filter_captains("已填写"))
        view_menu.add_command(label="只显示待询问", command=lambda: self.filter_captains("待询问"))
        menubar.add_cascade(label="视图", menu=view_menu)

        self.root.config(menu=menubar)

    def load_sorted_file(self):
        file_path = filedialog.askopenfilename(
            title="选择已归类文档",
            filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")]
        )
        if file_path:
            self.current_file = file_path
            self.captains = []
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                i = 0
                while i < len(lines):
                    line = lines[i].strip()
                    if not line:
                        i += 1
                        continue

                    # 解析状态标记和昵称
                    # 检查是否以符号开头
                    if line[0] in self.symbols:
                        if len(line) > 2:
                            status = line[0]
                            nickname = line[2:].strip()
                        else:
                            status = line[0]
                            nickname = ""
                    else:
                        status = " "
                        nickname = line

                    # 获取后续信息
                    if i + 3 < len(lines):
                        recipient = lines[i+1].strip()
                        phone = lines[i+2].strip()
                        address = lines[i+3].strip()

                        # 检查是否真的是地址信息 (简单的启发式判断)
                        if recipient and (phone.replace(' ', '').isdigit() or '省' in address or '市' in address or '区' in address):
                            # 如果已填写，自动取消标记
                            if recipient and phone and address:
                                status = " "
                            captain = {
                                'status': status,
                                'nickname': nickname,
                                'recipient': recipient,
                                'phone': phone,
                                'address': address,
                                'filled': True
                            }
                            i += 4
                        else:
                            captain = {
                                'status': status if status else "^",  # 默认待询问
                                'nickname': nickname,
                                'recipient': "",
                                'phone': "",
                                'address': "",
                                'filled': False
                            }
                            i += 1
                    else:
                        captain = {
                            'status': status if status else "^",  # 默认待询问
                            'nickname': nickname,
                            'recipient': "",
                            'phone': "",
                            'address': "",
                            'filled': False
                        }
                        i += 1

                    self.captains.append(captain)
                    # 跳过可能的空行
                    while i < len(lines) and not lines[i].strip():
                        i += 1

                self.refresh_lists()
                self.update_stats()
                self.status_bar.config(text=f"已加载文件: {os.path.basename(file_path)} - 共{len(self.captains)}个舰长")
            except Exception as e:
                messagebox.showerror("错误", f"读取文件时出错: {str(e)}")

    def load_unsorted_file(self):
        file_path = filedialog.askopenfilename(
            title="选择未归类名单",
            filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")]
        )
        if file_path:
            self.current_file = file_path
            self.captains = []
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                for line in lines:
                    nickname = line.strip()
                    if nickname:  # 忽略空行
                        self.captains.append({
                            'status': '^',  # 默认标记为待询问
                            'nickname': nickname,
                            'recipient': "",
                            'phone': "",
                            'address': "",
                            'filled': False
                        })
                self.refresh_lists()
                self.update_stats()
                self.status_bar.config(text=f"已加载未归类名单: {os.path.basename(file_path)} - 共{len(self.captains)}个舰长")
            except Exception as e:
                messagebox.showerror("错误", f"读取文件时出错: {str(e)}")

    def refresh_lists(self):
        # 清空列表
        for item in self.filled_tree.get_children():
            self.filled_tree.delete(item)
        for item in self.unfilled_tree.get_children():
            self.unfilled_tree.delete(item)

        # 应用筛选
        filtered_captains = self.filter_captains_list(self.current_filter)

        # 重新填充
        for captain in filtered_captains:
            if captain['filled']:
                # 处理隐藏收件人逻辑
                display_recipient = captain['recipient']
                if self.hide_recipient:
                    display_recipient = "***"
                
                self.filled_tree.insert("", "end", values=(captain['nickname'], display_recipient))
            else:
                # 获取状态显示文本
                status_text = self.symbols.get(captain['status'], {}).get('name', captain['status'])
                self.unfilled_tree.insert("", "end", values=(status_text, captain['nickname']), tags=(captain['status'],))

    def filter_captains_list(self, filter_type):
        if filter_type == "全部":
            return self.captains
        elif filter_type == "已填写":
            return [c for c in self.captains if c['filled']]
        else:
            # 根据状态名称查找对应的符号
            status_symbol = None
            for symbol, info in self.symbols.items():
                if info['name'] == filter_type:
                    status_symbol = symbol
                    break
            
            if status_symbol:
                if status_symbol == " ":  # 已填写
                    return [c for c in self.captains if c['filled']]
                else:
                    return [c for c in self.captains if not c['filled'] and c['status'] == status_symbol]
            else:
                return self.captains

    def on_filter_changed(self, event):
        self.current_filter = self.filter_var.get()
        self.refresh_lists()

    def filter_captains(self, filter_type):
        self.filter_var.set(filter_type)
        self.current_filter = filter_type
        self.refresh_lists()

    def on_filled_select(self, event):
        selection = self.filled_tree.selection()
        if selection:
            item = selection[0]
            values = self.filled_tree.item(item, "values")
            nickname = values[0]
            # 找到对应的舰长
            for captain in self.captains:
                if captain['nickname'] == nickname and captain['filled']:
                    self.populate_edit_form(captain)
                    break

    def on_unfilled_select(self, event):
        selection = self.unfilled_tree.selection()
        if selection:
            item = selection[0]
            values = self.unfilled_tree.item(item, "values")
            nickname = values[1]
            # 找到对应的舰长
            for captain in self.captains:
                if captain['nickname'] == nickname and not captain['filled']:
                    self.populate_edit_form(captain)
                    break

    def populate_edit_form(self, captain):
        self.status_var.set(captain['status'])
        self.nickname_var.set(captain['nickname'])
        self.recipient_var.set(captain['recipient'])
        self.phone_var.set(captain['phone'])
        self.address_text.delete(1.0, tk.END)
        self.address_text.insert(1.0, captain['address'])

        # 更新信息填写状态指示器 (包含校验)
        self.update_status_indicator(captain)

        # 存储当前编辑的舰长索引
        for i, cap in enumerate(self.captains):
            if cap['nickname'] == captain['nickname']:
                self.current_edit_index = i
                break

    def update_status_indicator(self, captain):
        warnings = []
        
        # 1. 完整性检查
        if captain['filled']:
            status_text = "✅ 信息已完整 (自动取消标记)"
            status_color = "#4CAF50"
        else:
            missing_fields = []
            if not captain['recipient']: missing_fields.append("收件人")
            if not captain['phone']: missing_fields.append("手机号")
            if not captain['address']: missing_fields.append("地址")
            
            if missing_fields:
                status_text = f"❌ 缺少: {', '.join(missing_fields)}"
                status_color = "#F44336"
            else:
                status_text = "✅ 信息已完整"
                status_color = "#4CAF50"

        # 2. 手机号格式检查
        phone = captain['phone']
        if phone:
            if not phone.isdigit():
                warnings.append("手机号含非数字")
            elif len(phone) != 11:
                warnings.append(f"手机号位数异常({len(phone)}位)")

        # 3. 重复条目检查
        # 检查手机号重复
        if phone:
            for c in self.captains:
                if c is not captain and c['phone'] == phone:
                    warnings.append(f"手机号与 {c['nickname']} 重复")
                    break
        
        # 检查地址重复
        addr = captain['address']
        if addr:
            for c in self.captains:
                if c is not captain and c['address'] == addr:
                    warnings.append(f"地址与 {c['nickname']} 重复")
                    break

        # 组合最终显示文本
        final_text = status_text
        if warnings:
            final_text += f"\n⚠️ 警告: {'; '.join(warnings)}"
            status_color = "#FF9800" # 有警告时变为橙色

        self.status_indicator.config(text=final_text, fg=status_color)

    def save_changes(self):
        if hasattr(self, 'current_edit_index'):
            status = self.status_var.get()
            nickname = self.nickname_var.get().strip()
            recipient = self.recipient_var.get().strip()
            phone = self.phone_var.get().strip()
            address = self.address_text.get(1.0, tk.END).strip()

            # 验证昵称
            if not nickname:
                messagebox.showwarning("警告", "昵称不能为空！")
                return

            # 检查是否已填写信息
            filled = bool(recipient and phone and address)

            # 如果已填写，自动取消标记（状态设为空格）
            if filled:
                status = " "

            # 更新舰长信息
            self.captains[self.current_edit_index] = {
                'status': status if status else "^",
                'nickname': nickname,
                'recipient': recipient,
                'phone': phone,
                'address': address,
                'filled': filled
            }

            self.refresh_lists()
            self.update_stats()
            self.status_bar.config(text="修改已保存")
            # 更新状态指示器
            self.update_status_indicator(self.captains[self.current_edit_index])
        else:
            messagebox.showinfo("提示", "请先选择一个舰长进行编辑")

    def set_status(self, status):
        if hasattr(self, 'current_edit_index'):
            self.status_var.set(status)
            self.save_changes()

    def delete_current(self):
        if hasattr(self, 'current_edit_index'):
            if messagebox.askyesno("确认", "确定要删除这个舰长吗？"):
                captain_name = self.captains[self.current_edit_index]['nickname']
                del self.captains[self.current_edit_index]
                self.refresh_lists()
                self.update_stats()
                self.clear_form()
                self.status_bar.config(text=f"舰长 '{captain_name}' 已删除")

    def clear_form(self):
        self.status_var.set("^")
        self.nickname_var.set("")
        self.recipient_var.set("")
        self.phone_var.set("")
        self.address_text.delete(1.0, tk.END)
        self.status_indicator.config(text="", fg="black")

    def update_stats(self):
        total = len(self.captains)
        filled = len([c for c in self.captains if c['filled']])
        unfilled = total - filled
        self.total_label.config(text=f"总人数: {total}")
        self.filled_label.config(text=f"已填写: {filled}")
        self.unfilled_label.config(text=f"未填写: {unfilled}")

    def save_file(self):
        if self.current_file:
            self._save_to_file(self.current_file)
        else:
            self.save_as_file()

    def save_as_file(self):
        file_path = filedialog.asksaveasfilename(
            title="保存文件",
            defaultextension=".txt",
            filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")]
        )
        if file_path:
            self.current_file = file_path
            self._save_to_file(file_path)

    def _save_to_file(self, file_path):
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                for captain in self.captains:
                    # 如果已填写，自动取消标记（不写入状态符号）
                    if captain['filled']:
                        f.write(f"{captain['nickname']}\n")
                    else:
                        # 写入状态符号和昵称
                        f.write(f"{captain['status']} {captain['nickname']}\n")

                    # 如果已填写，写入详细信息
                    if captain['filled']:
                        f.write(f"{captain['recipient']}\n")
                        f.write(f"{captain['phone']}\n")
                        f.write(f"{captain['address']}\n")
                    f.write("\n")  # 添加空行分隔
            self.status_bar.config(text=f"文件已保存: {os.path.basename(file_path)}")
            messagebox.showinfo("保存成功", "文件保存成功！")
        except Exception as e:
            messagebox.showerror("保存错误", f"保存文件时出错: {str(e)}")

    def copy_filled_addresses(self):
        addresses_text = ""
        filled_captains = [c for c in self.captains if c['filled']]
        if not filled_captains:
            messagebox.showinfo("提示", "没有已填写的舰长地址")
            return

        for captain in filled_captains:
            addresses_text += f"{captain['recipient']}\n"
            addresses_text += f"{captain['phone']}\n"
            addresses_text += f"{captain['address']}\n\n"

        try:
            pyperclip.copy(addresses_text.strip())
            self.status_bar.config(text=f"已复制{len(filled_captains)}个舰长的地址信息到剪贴板")
            messagebox.showinfo("复制成功", f"已复制{len(filled_captains)}个舰长的地址信息到剪贴板")
        except Exception as e:
            messagebox.showerror("复制错误", f"复制到剪贴板时出错: {str(e)}")

    def export_filled_addresses(self):
        """新增：导出已填写地址为TXT文件"""
        filled_captains = [c for c in self.captains if c['filled']]
        if not filled_captains:
            messagebox.showinfo("提示", "没有已填写的舰长地址可导出")
            return

        file_path = filedialog.asksaveasfilename(
            title="导出已填写地址",
            defaultextension=".txt",
            filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")],
            initialfile="已填写地址导出.txt"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    for captain in filled_captains:
                        f.write(f"{captain['recipient']}\n")
                        f.write(f"{captain['phone']}\n")
                        f.write(f"{captain['address']}\n\n")
                self.status_bar.config(text=f"已导出 {len(filled_captains)} 个地址到 {os.path.basename(file_path)}")
                messagebox.showinfo("导出成功", f"成功导出 {len(filled_captains)} 个舰长地址！")
            except Exception as e:
                messagebox.showerror("导出错误", f"导出文件时出错: {str(e)}")

    def toggle_hide_recipient(self):
        """新增：切换隐藏收件人状态"""
        self.hide_recipient = self.hide_var.get()
        self.refresh_lists()

    def mark_all_pending(self):
        """新增：将所有未填写且非特定状态的舰长标记为待询问"""
        if not self.captains:
            return
        if messagebox.askyesno("确认", "将所有未填写的舰长标记为'待询问'吗？\n(这将覆盖除'无需'、'小号'、'特殊情况'、'主播'以外的状态)"):
            count = 0
            protected_symbols = ["!", "&", "-", "~"] # 无需、小号、特殊情况、主播
            for captain in self.captains:
                if not captain['filled'] and captain['status'] not in protected_symbols:
                    captain['status'] = '^'
                    count += 1
            if count > 0:
                self.refresh_lists()
                self.status_bar.config(text=f"已标记{count}个舰长为'待询问'")
                messagebox.showinfo("完成", f"已标记{count}个舰长为'待询问'")
            else:
                messagebox.showinfo("提示", "没有需要标记的舰长")

    def mark_all_asked(self):
        if not self.captains:
            return
        if messagebox.askyesno("确认", "将所有未填写的舰长标记为'已询问(QQ)'吗？"):
            count = 0
            for captain in self.captains:
                if not captain['filled'] and captain['status'] == '^':  # 只标记待询问的
                    captain['status'] = '@'
                    count += 1
            if count > 0:
                self.refresh_lists()
                self.status_bar.config(text=f"已标记{count}个舰长为'已询问(QQ)'")
                messagebox.showinfo("完成", f"已标记{count}个舰长为'已询问(QQ)'")
            else:
                messagebox.showinfo("提示", "没有需要标记的舰长")

def main():
    root = tk.Tk()
    # 设置窗口图标（如果有图标文件）
    # root.iconbitmap('icon.ico')
    # 设置样式
    style = ttk.Style()
    style.theme_use('clam')
    # 配置Treeview样式
    style.configure("Treeview", background="#FFFFFF", foreground="black", rowheight=25, fieldbackground="#FFFFFF")
    style.map('Treeview', background=[('selected', '#4CAF50')])
    app = CaptainAddressManager(root)
    root.mainloop()

if __name__ == "__main__":
    main()
