<script setup lang="ts">

</script>


<template>
    <el-header class="navbar">
      <div><img class="log64" src="@/assets/log/logo64.png"/></div>
      <div><a class="page-tab">分房热力图</a></div>
      <div><a class="page-tab">总体趋势图</a></div>
      <div><a class="todo-list">待定计划</a></div>
      <div><a class="link-tab">GitHub源码</a></div>
      <div><a class="link-tab">数据</a></div>
      <div><a class="link-tab">反馈</a></div>
      <div><a class="link-tab nav-tab-point">论坛<span class="nav-tab-span">NEW</span></a></div>
      <div><a class="link-tab">作者ControlNet</a></div>
    </el-header>
</template>

<style scoped>
.log64{
    width: 32px;
    height: 32px;
}
.navbar{
    display: flex;
    align-items: center;
    height: auto;
    width: 100vw;
    background-color: black;
    flex-direction: row;
    flex-wrap: wrap;
}

.navbar > div {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 20px;
  transition:1s;
}

.navbar > div:not(:first-child):hover{
  background: linear-gradient(rgb(0, 0, 0), rgb(30, 158, 218)); ;
  cursor: pointer;
}

.page-tab{
  color: #EEFFFF;
}

.todo-list{
  color: #F07178;
}

.link-tab{
  color:#89DDFF
}

.nav-tab-point{
  position: relative;
}

.nav-tab-span{
  position: absolute;
  color: #FFCB6B;
  font-size: 6px;
  top: -5px;
}
</style>