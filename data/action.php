<?php
//echo "<pre>";print_r($_REQUEST);echo "</pre>";
$action=$_REQUEST['action'];
$mode=$_REQUEST['mode'];
$startTime=$_REQUEST['startTime'];
$endTime=$_REQUEST['endTime'];
$current_date=$_REQUEST['current_date'];
if($action=="getcalendarevents")
{
    if($mode=="month")
    {
        $format_date=explode("GMT",$current_date);
        $start_date=date("Y-m-01",strtotime($format_date[0]));
        $end_date=$st_date=date("Y-m-t",strtotime($format_date[0]));
        $range=range(1,30);
        $array_rand=array_rand($range,15);
        
        $period = new DatePeriod(new DateTime($start_date),new DateInterval('P1D'),new DateTime($end_date));
        //echo "<pre>";print_r($period);echo "</pre>";
        foreach($period as $key=> $date)
        {
            $current_time = date("h:i:s a");
            $endTime= date('h:i:s a',strtotime($current_time . ' +60 minutes'));
            $event_date=$date->format("Y-m-d")." ".$current_time;
            if(is_array($array_rand))
            {
                if(in_array($key,$array_rand))
                {
                    $i=$key+1;
                    $output_array[]=array(
                        "title" => 'Event Title_'.$i,
                        "startTime" =>$event_date,
                        "endTime" => $event_date,
                        "event_time" =>date("h",strtotime($current_time))."-".date("hA",strtotime($endTime)),
                        "allDay" => false
                    );

                }
            }
       
        }
        
    }
    else if($mode=="week")
    {
        $week_st_format_date=explode("GMT",$startTime);
        $week_ed_format_date=explode("GMT",$endTime);
        $start_date=date("Y-m-d",strtotime($week_st_format_date[0]));
        $end_date=date("Y-m-d",strtotime($week_ed_format_date[0]));
        
    }
    else if($mode=="day")
    {
        $format_date=explode("GMT",$current_date);
        $start_date=date("Y-m-d",strtotime($format_date[0])); 
    }
    
    
    
    
    
    
    
    $result=array("ret" => "1","events"=>$output_array);
    echo json_encode($result);
}
