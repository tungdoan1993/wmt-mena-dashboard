import json, pandas as pd
s=open('index.html').read()
i=s.find('const DATA = ['); j=s.find('];', i)
data=json.loads(s[i+len('const DATA = '):j+1])
print('total',len(data), 'dubai',sum(1 for d in data if d['office']=='Dubai'))
other=[d for d in data if d['office']!='Dubai']
L=pd.read_pickle('/home/claude/work/ledger_final.pkl')
L=L[~L.Type.isin(['WeGolden (excluded)','Personal (excluded)'])]
new=[]
for _,r in L.iterrows():
    new.append({"office":"Dubai","mk":r.Date.strftime('%Y-%m'),"date":r.Date.strftime('%Y-%m-%d'),
                "type":str(r.Type),"cat":str(r.Category),
                "desc":f"{r.Source}: {str(r.Description)[:110]}",
                "amt":round(float(r.Amount),2),"cur":str(r.Currency),
                "notes":(str(r.Notes)[:160] if pd.notna(r.Notes) else "")})
out=new+other
open('index.html','w').write(s[:i]+'const DATA = '+json.dumps(out,ensure_ascii=False)+s[j+1:])
print('new dubai rows',len(new),'total',len(out))
