& "$PSScriptRoot\capmany.ps1" -Port 5585 -Tag before -Streams 'D_6'
& "$PSScriptRoot\capmany.ps1" -Port 5584 -Tag after -Streams 'A_8,A_4,A_5,A_6,A_7;D_1,D_2,D_3,D_4,D_5,D_6,D_7,D_8,D_9,D_a,A_9;A_a,A_b,A_c,A_d' -PinFrom before
exit 0
