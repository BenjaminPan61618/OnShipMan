import requests
import time
import sys
import os

# 通用请求头（减少被风控概率）
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Referer": "https://live.bilibili.com/",
    "Origin": "https://live.bilibili.com",
}

def uid_to_roomid(uid: int) -> int | None:
    """
    UID → 房间号（真实 room_id）
    - 接口：live_user/v1/Master/info（无需 Cookie，返回中含 room_id）。
    """
    api = "https://api.live.bilibili.com/live_user/v1/Master/info"
    try:
        r = requests.get(api, params={"uid": uid}, headers=HEADERS, timeout=10)
        r.raise_for_status()
        j = r.json()
    except Exception as e:
        print(f"[-] 请求 Master/info 失败: {e}")
        return None

    if j.get("code") != 0:
        print(f"[-] Master/info 接口返回错误: code={j.get('code')}, msg={j.get('msg')}")
        return None

    data = j.get("data") or {}
    room_id = data.get("room_id")
    if not room_id:
        print("[-] 未获取到 room_id，该账号可能没有直播间。")
        return None
    return int(room_id)


def fetch_guard_names(uid: int, roomid: int, *, page_size: int = 29, typ: int = 5) -> list[str]:
    """
    拉取舰长昵称列表（含 Top3，去重）。
    - 接口：/xlive/app-room/v2/guardTab/topListNew
    """
    api = "https://api.live.bilibili.com/xlive/app-room/v2/guardTab/topListNew"
    names: list[str] = []
    seen: set[str] = set()
    page = 1

    while True:
        params = {
            "roomid": roomid,
            "ruid": uid,
            "page": page,
            "page_size": page_size,
            "typ": typ,
        }
        try:
            r = requests.get(api, params=params, headers=HEADERS, timeout=10)
            r.raise_for_status()
            j = r.json()
        except Exception as e:
            print(f"[-] 获取舰长列表失败（第{page}页）: {e}")
            break

        if j.get("code") != 0:
            print(f"[-] 接口返回错误: code={j.get('code')}, msg={j.get('msg')}")
            break

        data = j.get("data") or {}
        top3: list[dict] = data.get("top3") or []
        lst: list[dict] = data.get("list") or []

        # 处理 Top3
        for item in top3:
            try:
                name = item.get("uinfo", {}).get("base", {}).get("name")
                if name and name not in seen:
                    seen.add(name)
                    names.append(name)
            except Exception:
                continue

        # 处理当前页 list
        for item in lst:
            try:
                name = item.get("uinfo", {}).get("base", {}).get("name")
                if name and name not in seen:
                    seen.add(name)
                    names.append(name)
            except Exception:
                continue

        # 本页 list 为空，已遍历完毕
        if not lst:
            break

        page += 1
        time.sleep(1)  # 控制频率，避免风控

    return names


def main():
    print("B站舰长昵称导出工具（仅导出公开信息，请合理控制频率）")
    try:
        uid_str = input("请输入主播的UID: ").strip()
        if not uid_str.isdigit():
            print("[-] UID 必须是纯数字。")
            return
        uid = int(uid_str)
    except Exception:
        print("[-] 输入异常。")
        return

    print("[*] 正在根据 UID 查询房间号（room_id）……")
    roomid = uid_to_roomid(uid)
    if not roomid:
        return
    print(f"[+] 房间号（真实 room_id）: {roomid}")

    print("[*] 正在拉取舰长列表，请稍候（每页间隔约 1 秒）……")
    names = fetch_guard_names(uid, roomid)
    if not names:
        print("[-] 未拉取到舰长信息（该账号可能没有公开舰长，或接口受限）。")
        return

    out = f"guards_{uid}.txt"
    with open(out, "w", encoding="utf-8") as f:
        for n in names:
            f.write(n + "\n")
    print(f"[+] 完成！共导出 {len(names)} 个舰长昵称。文件: {os.path.abspath(out)}")


if __name__ == "__main__":
    main()

