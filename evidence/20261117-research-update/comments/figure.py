"""Regenerate the aggregate figure from edges.csv and nodes.csv in this directory."""
import argparse,csv
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import networkx as nx

def read(p):
    with p.open(encoding='utf-8-sig') as f:return list(csv.DictReader(f))
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('font',help='path to a CJK font')
    a=parser.parse_args(); root=Path(__file__).resolve().parent
    font=FontProperties(fname=a.font)
    rows=read(root/'edges.csv')[:20]; counts={r['term']:int(r['documents']) for r in read(root/'nodes.csv')}
    G=nx.Graph()
    for r in rows:G.add_edge(r['term_a'],r['term_b'],weight=int(r['documents']))
    xy=nx.spring_layout(G,seed=17,k=.85,iterations=250)
    fig,ax=plt.subplots(figsize=(9.6,6.5))
    for u,v,w in G.edges.data('weight'):
        ax.plot(*zip(xy[u],xy[v]),color='#9aaaa9',linewidth=.7+(w-rows_count(rows[-1]))*.10,zorder=0)
    for n,(x,y) in xy.items():
        ax.scatter(x,y,s=180+counts[n]*2.3,c='#dbece8',edgecolors='#376d65',linewidths=1)
        ax.text(x,y,n,fontproperties=font,ha='center',va='center',fontsize=11,color='#172e29',bbox={'facecolor':'#f8fffc','edgecolor':'none','pad':.6,'alpha':.85})
    ax.margins(.14);ax.set_axis_off();fig.subplots_adjust(top=.88,bottom=.09,left=.02,right=.98)
    fig.text(.04,.94,'消费航拍机标题范围内评论的共词关系',fontproperties=font,fontsize=19)
    fig.text(.04,.885,'1,318 个去重文本簇，固定 137 词；图中展示共现次数最高的 20 对。',fontproperties=font,fontsize=10)
    fig.text(.04,.035,'点面积随含词文本数增大，线宽随同条评论中的共现次数增加。',fontproperties=font,fontsize=10)
    fig.savefig(root/'cooccurrence.png',dpi=165,facecolor='white');plt.close(fig)
def rows_count(r):return int(r['documents'])
if __name__=='__main__':main()
