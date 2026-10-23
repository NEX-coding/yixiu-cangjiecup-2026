#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sync doubao prompts to SQLite prompt_library.db (legacy admin reads this)"""
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "./data/data/prompt_library.db"

PROMPTS = [
    (3, "街拍爆款视频", """9:16 竖屏真人写实视频，苹果原生相机质感，画面稳定。18-20 岁冷白皮东亚少女，全程不露脸，身形匀称自然；整套穿搭精准复刻参考图一，还原版型、配色与面料纹理，若露腿搭配美肤袜。背景为都市街景墙面与石板路，色调自然真实。
左手持白色 iPhone17 Pro Max 遮脸并保持不动；右手动作连贯自然：撩发至耳后→单手叉腰→手臂自然垂落→侧身 45° 展示服饰垂感→缓慢回正站姿。全身微远景构图，人物居中，头顶留白 30%，脚底留白 20%，人物画面占比约 60%。固定机位与焦距，无运镜、无缩放。肤质通透，服饰纹理清晰，整体色调自然干净。避免畸形、穿模、肢体扭曲、比例异常，保持真实人体结构与真实拍摄效果。"""),
    (4, "室内居家视频", """9:16 竖屏真人写实视频，苹果原生相机质感，画面稳定。18-20 岁冷白皮东亚少女，全程不露脸，身形匀称自然；整套穿搭精准复刻参考图一，还原版型、配色与面料纹理。背景为明亮暖白调室内（落地窗、浅色墙面、沙发或绿植点缀），柔光均匀，家居氛围温馨。
人物自然站立，动作轻柔连贯：整理衣角→轻抚针织/家居服面料→微微侧身展示垂感→双手自然交叠→缓慢回正。节奏偏慢、无夸张摆拍，适合针织衫/家居服种草。全身微远景构图，人物居中，头顶留白 30%，脚底留白 20%。固定机位，无运镜。肤质通透，服饰纹理清晰，色调温柔干净。"""),
    (5, "商业主图视频", """9:16 竖屏真人写实视频，苹果原生相机质感，画面稳定。18-20 岁冷白皮东亚少女，全程不露脸，身形匀称自然；整套穿搭精准复刻参考图一，突出版型卖点与面料细节。背景简洁高级、杂讯少，适合电商主图与大促链接。
人物居中略靠前，动作克制专业：正面展示→微转 30° 展示侧面版型→轻拉衣摆展示细节→回正定格。强调服装色彩精准、边缘清晰，商业棚拍质感。全身微远景构图，头顶留白 30%，脚底留白 20%。固定机位，无运镜。高清商业摄影级成片，避免畸形、穿模、肢体扭曲。"""),
    (6, "模特带货视频", """9:16 竖屏真人写实视频，苹果原生相机质感，画面稳定。18-20 岁冷白皮东亚少女，全程不露脸，身形匀称自然；整套穿搭精准复刻参考图一，强调搭配、垂感与身形比例，适合短视频带货与直播切片。
人物全身居中，站姿略带动态感：自然起步→单手叉腰展示搭配→转身 70° 展示背面与侧线→回正并轻迈步展示垂感→定格。动作连贯有节奏，真实种草质感。全身微远景构图，头顶留白 30%，脚底留白 20%，人物画面占比约 60%。固定机位，无运镜。肤质通透，服饰纹理清晰。"""),
]

def main():
    conn = sqlite3.connect(DB)
    now = __import__("datetime").datetime.utcnow().isoformat() + "Z"
    for pid, title, content in PROMPTS:
        row = conn.execute("SELECT id FROM prompts WHERE id=?", (pid,)).fetchone()
        if row:
            conn.execute(
                "UPDATE prompts SET title=?, content=?, updated_at=? WHERE id=?",
                (title, content, now, pid),
            )
        else:
            conn.execute(
                "INSERT INTO prompts (id, title, content, created_at, updated_at) VALUES (?,?,?,?,?)",
                (pid, title, content, now, now),
            )
        print("prompt #%s ok" % pid)
    conn.commit()
    conn.close()
    print("done")

if __name__ == "__main__":
    main()
