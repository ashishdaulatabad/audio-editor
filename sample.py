init = 'KRYPTOSABCDEFGHIJLMNQUVWXZ'
curr = 'OBKRUOXOGHULBSOLIFBBWFLRVQQPRNGKSSOTWTQSJQSSEKZZWATJKLUDIAWINFBNYPVTTMZFPKWGDKZXTJCDIGKUHUAUEKCAR'

rev_curr = ''.join(reversed(curr))
answer = ''

for c, b in zip(curr, rev_curr):
  off = ord(b) - ord('A')
  answer += init[(off + ord(c) - ord('A') + 26) % 26]

print(answer)